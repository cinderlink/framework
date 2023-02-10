import { CID } from "multiformats/cid";
import {
  BlockFilters,
  InstructionType,
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

export type QueryUnwindState<
  Row extends TableRow = TableRow,
  Def extends TableDefinition = TableDefinition
> = { cid: string; block: TableBlockInterface<Row, Def>; changed: boolean };

export class QueryBuilder<Row extends TableRow = TableRow> {
  _terminator: string | false = false;
  constructor(public instructions: QueryInstruction[] = []) {}
  where<Key extends keyof Row = keyof Row>(
    field: Key,
    operation: Operation,
    value: Row[Key]
  ) {
    this.instructions.push({
      instruction: "where",
      field,
      operation,
      value,
    } as WhereInstruction);
    return this;
  }

  orderBy<Key extends keyof Row = keyof Row>(
    field: Key,
    direction: "asc" | "desc"
  ) {
    this.instructions.push({
      instruction: "orderBy",
      field: field as string,
      direction,
    });
    return this;
  }

  limit(value: number) {
    this.instructions.push({
      instruction: "limit",
      limit: value,
    });
    return this;
  }

  offset(value: number) {
    this.instructions.push({
      instruction: "offset",
      offset: value,
    });
    return this;
  }

  and(fn: (qb: QueryBuilder) => void) {
    const instructions: QueryInstruction[] = [];
    const qb = new QueryBuilder(instructions);
    fn(qb);

    this.instructions.push({
      instruction: "and",
      queries: instructions,
    });

    return this;
  }

  or(fn: (qb: QueryBuilder) => void) {
    const instructions: QueryInstruction[] = [];
    const qb = new QueryBuilder(instructions);
    fn(qb);

    this.instructions.push({
      instruction: "or",
      queries: instructions,
    });

    return this;
  }

  update(values: Partial<Row>) {
    if (this._terminator)
      throw new Error(
        `Cannot execute ${this._terminator} after ${this._terminator}`
      );
    this._terminator = "update";
    this.instructions.push({
      instruction: "update",
      values,
    } as UpdateInstruction);
    return this;
  }

  delete() {
    if (this._terminator)
      throw new Error(
        `Cannot execute ${this._terminator} after ${this._terminator}`
      );
    this._terminator = "delete";
    this.instructions.push({
      instruction: "delete",
    } as DeleteInstruction);
    return this;
  }

  select(fields: (keyof Row)[] = []) {
    if (this._terminator)
      throw new Error(
        `Cannot execute ${this._terminator} after ${this._terminator}`
      );
    this._terminator = "select";
    this.instructions.push({
      instruction: "select",
      fields: fields as string[],
    } as SelectInstruction);
    return this;
  }
}

export class TableQuery<
    Row extends TableRow = TableRow,
    Def extends TableDefinition = TableDefinition
  >
  extends QueryBuilder<Row>
  implements TableQueryInterface<Row, Def>
{
  constructor(
    public table: TableInterface<Row, Def>,
    instructions: QueryInstruction[] = []
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

  async execute() {
    if (!this._terminator) {
      throw new Error("No terminator method called (update, delete, select)");
    }

    if (this.table.writing) {
      await this.table.awaitUnlock();
    }

    let terminator = this._terminator;
    let offset = this._offset;
    let limit = this._limit;

    // Block cache (for update and delete)
    const unwound: TableBlockInterface<Row, Def>[] = [];
    let returning: Row[] = [];
    await this.table.unwind(async (event) => {
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

      if (this._terminator === "update") {
        const updateInstruction = this.instructions.find(
          (i) => i.instruction === "update"
        ) as UpdateInstruction;
        for (const match of matches) {
          for (const [key, value] of Object.entries(updateInstruction.values)) {
            match[key as keyof Row] = value;
          }
          event.block.updateRecord(match.id, match);
        }
        const returningInstruction = this.instructions.find(
          (i) => i.instruction === "returning"
        ) as ReturningInstruction;
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
      } else if (this._terminator === "delete") {
        for (const match of matches) {
          event.block.deleteRecord(match.id);
        }
      } else if (this._terminator === "select") {
        const selectInstruction = this.instructions.find(
          (i) => i.instruction === "select"
        ) as SelectInstruction;
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

      if (returning.length >= limit) {
        returning = returning.slice(0, limit);
        event.resolved = true;
      }
    });

    if (unwound.length) {
      console.info(
        `ipld-database/table-query: ${unwound.length} blocks unwound. looking for updates...`
      );
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
          console.info(
            `ipld-database/table-query: first rewrite block found: ${block.cid} (prev: ${prevCID})`
          );
          rewriteBlock = new TableBlock<Row, Def>(this.table, undefined, {
            prevCID,
            headers,
            filters: {
              indexes: {},
              aggregates: {},
            },
          });
        }

        if (writeStarted && rewriteBlock) {
          const records = await block.records();
          for (const [index, record] of Object.entries(records)) {
            console.info(
              `ipld-database/table-query: rewriting record: ${record.id} (${index})`
            );
            await rewriteBlock.addRecord(record);
          }
          if (rewriteBlock.needsRollup) {
            console.info(
              `ipld-database/table-query: rewrite block saving: ${block.cid}`
            );
            prevCID = (await rewriteBlock.save())?.toString();
            console.info(
              `ipld-database/table-query: block rewritten. old CID: ${block.cid}, new CID: ${prevCID}`
            );
            const headers = await rewriteBlock.headers();
            rewriteBlock = new TableBlock<Row, Def>(this.table, undefined, {
              prevCID: prevCID?.toString(),
              headers: {
                ...headers,
                recordsFrom: headers.recordsFrom + 1,
                recordsTo: headers.recordsFrom,
              },
              filters: {
                indexes: {},
                aggregates: {},
              },
            });
          }
        }
      }
      if (rewriteBlock) {
        console.info(
          `ipld-database/table-query: block rewrite complete. ${
            rewriteBlock.cid
          } (records: ${Object.keys(rewriteBlock.cache!.records || {}).length})`
        );
        this.table.setBlock(rewriteBlock);
      }
      this.table.unlock();
    }

    return new TableQueryResult<Row>(returning);
  }

  instructionsMatchBlock(filters: BlockFilters) {
    let match = true;
    const whereInstructions: WhereInstruction[] = this.instructions
      .filter((i) => i.instruction === "where")
      .concat(
        this.instructions
          .filter((i) => i.instruction === "and" || i.instruction === "or")
          .map((i) =>
            (i as AndInstruction | OrInstruction).queries.filter(
              (q) => q.instruction === "where"
            )
          )
          .flat()
      ) as WhereInstruction[];

    for (const query of whereInstructions) {
      const { field, operation, value } = query;

      // Check if this block can be skipped due to conditional exceptions for aggregates
      const aggregate = this.table.def.aggregate?.[field];
      const aggregation = filters.aggregates?.[field];
      if (aggregate === "min") {
        if (
          (operation === ">=" && aggregation < value) ||
          (operation === ">" && aggregation <= value) ||
          (operation === "=" && aggregation > value) ||
          (operation === "in" && Math.max(...value) < aggregation) ||
          (operation === "between" && value?.[1] < aggregation)
        ) {
          match = false;
          break;
        }
      } else if (aggregate === "max") {
        if (
          (operation === "<=" && aggregation > value) ||
          (operation === "<" && aggregation >= value) ||
          (operation === "=" && aggregation < value) ||
          (operation === "in" && Math.min(...value) > aggregation) ||
          (operation === "between" && value?.[0] > aggregation)
        ) {
          match = false;
          break;
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
            (Math.min(...value) > max || Math.max(...value) < min)) ||
          (operation === "between" && (value?.[1] < min || value?.[0] > max))
        ) {
          match = false;
          break;
        }
      }

      // Check if this block can be skipped due to conditional exceptions for indexes
      if (match) {
        const relatedIndexes = Object.entries(this.table.def.indexes).filter(
          ([, index]) => index.fields.includes(field)
        );
        if (operation === "=" || operation === "!=") {
          for (const [indexName, index] of relatedIndexes) {
            const valuePosition = index.fields.indexOf(field);
            const indexValue = filters.indexes?.[indexName]?.[valuePosition];
            if (operation === "=" && indexValue !== value) {
              match = false;
              break;
            } else if (operation === "!=" && indexValue === value) {
              match = false;
              break;
            }
          }
        }
      }
    }

    return match;
  }

  instructionsMatchRecord(record: Row) {
    let match = true;
    const whereInstructions: WhereInstruction[] = this.instructions
      .filter((i) => i.instruction === "where")
      .concat(
        this.instructions
          .filter((i) => i.instruction === "and" || i.instruction === "or")
          .map((i) =>
            (i as AndInstruction | OrInstruction).queries.filter(
              (q) => q.instruction === "where"
            )
          )
          .flat()
      ) as WhereInstruction[];

    for (const query of whereInstructions) {
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
        if (!value.includes(record[field])) {
          match = false;
          break;
        }
      } else if (operation === "between") {
        if (
          Number(record[field]) < value?.[0] ||
          Number(record[field]) > value?.[1]
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
}
