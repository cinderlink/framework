import {
  BlockAggregates,
  BlockFilters,
  BlockHeaders,
  BlockIndexes,
  InstructionType,
  QueryBuilderInterface,
  TableDefinition,
} from "@candor/core-types";
import {
  TableRow,
  TableInterface,
  TableBlockInterface,
} from "@candor/core-types/src/database/table";
import {
  TableQueryInterface,
  QueryInstruction,
  Operation,
  WhereInstruction,
  QueryResult,
  AndInstruction,
  OrInstruction,
  UpdateInstruction,
  DeleteInstruction,
  SelectInstruction,
  ReturningInstruction,
} from "@candor/core-types/src/database/query";
import { TableBlock } from "./block";
import { cache } from "./cache";

export type QueryUnwindState<
  Row extends TableRow = TableRow,
  Def extends TableDefinition<Row> = TableDefinition<Row>
> = { cid: string; block: TableBlockInterface<Row, Def>; changed: boolean };

export class QueryBuilder<Row extends TableRow = TableRow>
  implements QueryBuilderInterface<Row>
{
  terminator: string | undefined = undefined;
  constructor(public instructions: QueryInstruction<Row>[] = []) {}
  where<Key extends keyof Row = keyof Row>(
    this: QueryBuilderInterface<Row>,
    field: Key,
    operation: Operation,
    value: Row[Key]
  ) {
    this.instructions.push({
      instruction: "where",
      field,
      operation,
      value,
    } as WhereInstruction<Row>);
    return this;
  }

  orderBy(
    this: QueryBuilderInterface<Row>,
    field: keyof Row,
    direction: "asc" | "desc"
  ) {
    this.instructions.push({
      instruction: "orderBy",
      field,
      direction,
    });
    return this;
  }

  limit(this: QueryBuilderInterface<Row>, value: number) {
    this.instructions.push({
      instruction: "limit",
      limit: value,
    });
    return this;
  }

  offset(this: QueryBuilderInterface<Row>, value: number) {
    this.instructions.push({
      instruction: "offset",
      offset: value,
    });
    return this;
  }

  and(
    this: QueryBuilderInterface<Row>,
    fn: (qb: QueryBuilderInterface<Row>) => void
  ) {
    const instructions: QueryInstruction<Row>[] = [];
    const qb = new QueryBuilder<Row>(instructions);
    fn(qb as QueryBuilderInterface<Row>);

    this.instructions.push({
      instruction: "and",
      queries: instructions,
    });

    return this;
  }

  or(
    this: QueryBuilderInterface<Row>,
    fn: (qb: QueryBuilderInterface<Row>) => void
  ) {
    const instructions: QueryInstruction<Row>[] = [];
    const qb = new QueryBuilder<Row>(instructions);
    fn(qb as QueryBuilderInterface<Row>);

    this.instructions.push({
      instruction: "or",
      queries: instructions,
    });

    return this;
  }

  update(
    this: QueryBuilderInterface<Row>,
    values:
      | Partial<Row>
      | ((row: Row) => Promise<Exclude<Row, "id">> | Exclude<Row, "id">)
  ) {
    if (this.terminator)
      throw new Error(
        `Cannot execute ${this.terminator} after ${this.terminator}`
      );

    this.terminator = "update";
    this.instructions.push({
      instruction: "update",
      ...(typeof values === "function" ? { fn: values } : { values }),
    } as UpdateInstruction<Row>);
    return this;
  }

  delete(this: QueryBuilderInterface<Row>) {
    if (this.terminator)
      throw new Error(
        `Cannot execute ${this.terminator} after ${this.terminator}`
      );
    this.terminator = "delete";
    this.instructions.push({
      instruction: "delete",
    } as DeleteInstruction);
    return this;
  }

  select(this: QueryBuilderInterface<Row>, fields?: (keyof Row)[]) {
    if (this.terminator)
      throw new Error(
        `Cannot execute ${this.terminator} after ${this.terminator}`
      );
    this.terminator = "select";
    this.instructions.push({
      instruction: "select",
      fields: (fields || []) as (keyof Row)[],
    } as SelectInstruction<Row>);
    return this;
  }

  returning(this: QueryBuilderInterface<Row>, fields?: (keyof Row)[]) {
    this.instructions.push({
      instruction: "returning",
      fields: (fields || []) as (keyof Row)[],
    } as ReturningInstruction<Row>);
    return this;
  }

  nocache() {
    this.instructions.push({
      instruction: "nocache",
    });
    return this;
  }

  async execute(this: QueryBuilderInterface<Row>): Promise<QueryResult<Row>> {
    throw new Error(
      "Execute not implemented in base QueryBuilder class. TableQuery extends this class."
    );
  }
}

export class TableQuery<
    Row extends TableRow = TableRow,
    Def extends TableDefinition<Row> = TableDefinition<Row>
  >
  extends QueryBuilder<Row>
  implements TableQueryInterface<Row, Def>
{
  constructor(
    public table: TableInterface<Row, Def>,
    instructions: QueryInstruction<Row>[] = []
  ) {
    super(instructions);
  }

  get _offset() {
    return (
      (
        this.instructions.find(
          (i) => i.instruction === "offset"
        ) as InstructionType["offset"]
      )?.offset || 0
    );
  }

  get _limit() {
    return (
      (
        this.instructions.find(
          (i) => i.instruction === "limit"
        ) as InstructionType["limit"]
      )?.limit || Infinity
    );
  }

  async execute(): Promise<TableQueryResult<Row>> {
    if (!this.terminator) {
      throw new Error("No terminator method called (update, delete, select)");
    }

    if (cache.hasQuery<Row, Def>(this)) {
      return cache.getQuery<Row, Def>(this) as TableQueryResult<Row>;
    }

    if (this.table.writing) {
      await this.table.awaitUnlock();
    }

    const nocache = this.instructions.some((i) => i.instruction === "nocache");
    if (nocache) {
      cache.clear();
    }

    let terminator = this.terminator;
    let offset = this._offset;
    let limit = this._limit;

    // Block cache (for update and delete)
    const unwound: TableBlockInterface<Row, Def>[] = [];
    let returning: Row[] = [];
    await this.table.unwind(async (event) => {
      await event.block.headers();
      // we need to make sure the block is aggregated before we can use it
      if (!event.block.cache?.filters?.aggregates || !event.block.cid) {
        await event.block.aggregate();
      }

      if (["update", "delete"].includes(terminator)) {
        unwound.push(event.block as TableBlockInterface<Row, Def>);
      }

      const filters = await event.block.filters();
      if (!this.instructionsMatchBlock(filters)) {
        return;
      }
      const records = (await event.block.records()) as Record<string, Row>;
      const matches = Object.values(records).filter((r: Row) =>
        this.instructionsMatchRecord(r)
      );
      if (offset > matches.length) {
        offset -= matches.length;
        return;
      }

      if (this.terminator === "update") {
        const updateInstruction = this.instructions.find(
          (i) => i.instruction === "update"
        ) as UpdateInstruction<Row>;
        for (const match of matches) {
          if (updateInstruction.fn) {
            const updated = updateInstruction.fn(match);
            await event.block.updateRecord(match.id, updated).catch(() => {
              console.error(
                "Failed to update record (unique key constraint violation)",
                match
              );
            });
          } else if (updateInstruction.values) {
            for (const [key, value] of Object.entries(
              updateInstruction.values
            )) {
              match[key as keyof Row] = value;
            }
            await event.block.updateRecord(match.id, match).catch(() => {
              console.error(
                "Failed to update record (unique key constraint violation)",
                match
              );
            });
          } else {
            console.warn(`No update function or values provided to update`);
          }
        }
      } else if (this.terminator === "delete") {
        for (const match of matches) {
          console.info("deleting", match.id, match);
          event.block.deleteRecord(match.id);
        }
      } else if (this.terminator === "select") {
        const selectInstruction = this.instructions.find(
          (i) => i.instruction === "select"
        ) as SelectInstruction<Row>;
        returning = returning.concat(
          selectInstruction.fields?.length
            ? matches.map(
                (m: Row) =>
                  selectInstruction.fields?.reduce(
                    (acc, field) => ({ ...acc, [field]: m[field] }),
                    {}
                  ) as Row
              )
            : matches
        );
      }

      const returningInstruction = this.instructions.find(
        (i) => i.instruction === "returning"
      ) as ReturningInstruction<Row>;
      if (returningInstruction) {
        returning = returningInstruction.fields?.length
          ? returning.concat(
              matches.map(
                (m: Row) =>
                  returningInstruction.fields?.reduce(
                    (acc, field) => ({ ...acc, [field]: m[field] }),
                    {}
                  ) as Row
              )
            )
          : returning.concat(matches);
      }

      if (returning.length >= limit) {
        returning = returning.slice(0, limit);
        event.resolved = true;
      }
    });

    if (unwound.length) {
      let writeStarted = false;
      let rewriteBlock: TableBlockInterface<Row, Def> | undefined;
      let prevCID: string | undefined;
      if (this.table.writing) {
        await this.table.awaitLock();
      } else {
        this.table.lock();
      }
      for (const block of unwound.reverse()) {
        if (!writeStarted && block.changed) {
          writeStarted = true;
          const headers = await block.headers();
          prevCID = await block.prevCID();
          rewriteBlock = new TableBlock<Row, Def>(this.table, undefined, {
            prevCID,
            headers,
            filters: {
              indexes: {} as BlockIndexes<Row, Def>,
              aggregates: {} as BlockAggregates<Row>,
            },
          });
        }

        if (writeStarted && rewriteBlock) {
          const records = await block.records();
          console.info(
            `ipld-database/table-query: rewriting block ${block.cid}`,
            records
          );
          for (const [, record] of Object.entries(records)) {
            await rewriteBlock.addRecord(record);
          }
          if (rewriteBlock.needsRollup) {
            prevCID = (await rewriteBlock.save())?.toString();
            const headers = rewriteBlock.cache?.headers as BlockHeaders;
            console.info(
              `ipld-database/table-query: block rewritten. old CID: ${block.cid}, new CID: ${prevCID}, range: [${headers.recordsFrom}, ${headers.recordsTo}]`
            );
            rewriteBlock = new TableBlock<Row, Def>(this.table, undefined, {
              prevCID: prevCID?.toString(),
              headers: {
                ...headers,
                recordsFrom: headers.recordsTo,
                recordsTo: headers.recordsTo + 1,
              },
              filters: {
                indexes: {} as BlockIndexes<Row, Def>,
                aggregates: {} as BlockAggregates<Row>,
              },
            });
          }
        }
      }
      if (rewriteBlock) {
        this.table.setBlock(rewriteBlock);
      }
      this.table.unlock();
    }

    const result = new TableQueryResult<Row>(returning);
    cache.cacheQuery(this as any, result as any);
    return result;
  }

  instructionsMatchBlock(filters: BlockFilters<Row, Def>) {
    const whereInstructions: WhereInstruction<Row>[] = this.instructions
      .filter((i) => i.instruction === "where")
      .concat(
        this.instructions
          .filter((i) => i.instruction === "and" || i.instruction === "or")
          .map((i) =>
            (i as AndInstruction<Row> | OrInstruction<Row>).queries.filter(
              (q) => q.instruction === "where"
            )
          )
          .flat()
      ) as WhereInstruction<Row>[];

    for (const query of whereInstructions) {
      const { field, operation, value } = query;

      // Check if this block can be skipped due to conditional exceptions for aggregates
      const aggregate = this.table.def.aggregate?.[field as keyof Row];
      const aggregation = filters.aggregates?.[field as keyof Row];
      if (aggregate === "min") {
        if (
          (operation === ">=" && aggregation < value) ||
          (operation === ">" && aggregation <= value) ||
          (operation === "=" && aggregation > value) ||
          (operation === "in" &&
            Math.max(...(value as Row[keyof Row][]).map(Number)) <
              aggregation) ||
          (operation === "between" &&
            (value as [Row[keyof Row], Row[keyof Row]])?.[1] < aggregation)
        ) {
          return false;
        }
      } else if (aggregate === "max") {
        if (
          (operation === "<=" && aggregation > value) ||
          (operation === "<" && aggregation >= value) ||
          (operation === "=" && aggregation < value) ||
          (operation === "in" &&
            Math.min(...(value as Row[keyof Row][]).map(Number)) >
              aggregation) ||
          (operation === "between" &&
            (value as [Row[keyof Row]])?.[0] > aggregation)
        ) {
          return false;
        }
      } else if (aggregate === "range") {
        const [min, max] = aggregation as [number, number];
        if (
          (operation === "<=" && max > value) ||
          (operation === "<" && max >= value) ||
          (operation === ">=" && min < value) ||
          (operation === ">" && min <= value) ||
          (operation === "=" && (min > value || max < value)) ||
          (operation === "in" &&
            (Math.min(...(value as Row[keyof Row][]).map(Number)) > max ||
              Math.max(...(value as Row[keyof Row][]).map(Number)) < min)) ||
          (operation === "between" &&
            ((value as [Row[keyof Row], Row[keyof Row]])?.[1] < min ||
              (value as [Row[keyof Row]])?.[0] > max))
        ) {
          return false;
        }
      }

      // Check if this block can be skipped due to conditional exceptions for indexes
      const relatedIndexes = Object.entries(this.table.def.indexes).filter(
        ([, index]) => index.fields.includes(field)
      );
      if (operation === "=" || operation === "!=") {
        for (const [indexName, index] of relatedIndexes) {
          const valuePosition = index.fields.indexOf(field);
          const hasValidIndex = Object.values(
            filters.indexes?.[indexName] || {}
          ).some((index) =>
            operation === "="
              ? index.values[valuePosition] === value
              : index.values[valuePosition] !== value
          );
          if (!hasValidIndex) {
            return false;
          }
        }
      }
    }

    return true;
  }

  instructionsMatchRecord(record: Row) {
    const whereInstructions: WhereInstruction<Row>[] = this.instructions
      .filter((i) => i.instruction === "where")
      .concat(
        this.instructions
          .filter((i) => i.instruction === "and")
          .map((i) =>
            (i as AndInstruction<Row> | OrInstruction<Row>).queries.filter(
              (q) => q.instruction === "where"
            )
          )
          .flat()
      ) as WhereInstruction<Row>[];

    const orInstructions: OrInstruction<Row>[] = this.instructions.filter(
      (i) => i.instruction === "or"
    ) as OrInstruction<Row>[];

    return (
      this.whereInstructionsMatchRecord(whereInstructions, record) ||
      orInstructions.some((orInstruction) => {
        const whereInstructions: WhereInstruction<Row>[] = orInstruction.queries
          .filter((q) => q.instruction === "where")
          .concat(
            orInstruction.queries
              .filter((i) => i.instruction === "and")
              .map((i) =>
                (i as AndInstruction<Row> | OrInstruction<Row>).queries.filter(
                  (q) => q.instruction === "where"
                )
              )
              .flat()
          ) as WhereInstruction<Row>[];
        return this.whereInstructionsMatchRecord(whereInstructions, record);
      })
    );
  }

  whereInstructionsMatchRecord(where: WhereInstruction<Row>[], record: Row) {
    let match = true;
    for (const query of where) {
      const { field, operation, value } = query;

      if (operation === "=") {
        if (record[field] !== value) {
          match = false;
          break;
        }
      } else if (operation === "!=") {
        if (record[field] === value) {
          match = false;
          break;
        }
      } else if (operation === "<") {
        if (Number(record[field]) >= value) {
          match = false;
          break;
        }
      } else if (operation === "<=") {
        if (Number(record[field]) > value) {
          match = false;
          break;
        }
      } else if (operation === ">") {
        if (Number(record[field]) <= value) {
          match = false;
          break;
        }
      } else if (operation === ">=") {
        if (Number(record[field]) < value) {
          match = false;
          break;
        }
      } else if (operation === "in") {
        if (!(value as Row[keyof Row][]).includes(record[field])) {
          match = false;
          break;
        }
      } else if (operation === "between") {
        if (
          Number(record[field]) <
            (value as [Row[keyof Row], Row[keyof Row]])?.[0] ||
          Number(record[field]) >
            (value as [Row[keyof Row], Row[keyof Row]])?.[1]
        ) {
          match = false;
          break;
        }
      }
    }
    return match;
  }
}

export class TableQueryResult<Row extends TableRow = TableRow>
  implements QueryResult
{
  constructor(public rows: Row[]) {}

  first() {
    return this.rows[0];
  }

  last() {
    return this.rows[this.rows.length - 1];
  }

  all() {
    return this.rows;
  }

  filter(fn: (row: Row) => boolean) {
    return new TableQueryResult(this.rows.filter(fn));
  }

  pick<Keys extends (keyof Row)[]>(
    fields: Keys
  ): QueryResult<Extract<Row, Keys>> {
    const extracted = this.rows.map((row) => {
      const newRow: any = {};
      for (const field of fields) {
        newRow[field] = row[field];
      }
      return newRow;
    });

    return new TableQueryResult(extracted);
  }

  count() {
    return this.rows.length;
  }
}
