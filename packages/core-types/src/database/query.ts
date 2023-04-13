import { TableDefinition, TableInterface, TableRow } from "./table";

export type InstructionType<Row extends TableRow = TableRow> = {
  where: WhereInstruction<Row>;
  orderBy: OrderByInstruction<Row>;
  limit: LimitInstruction;
  offset: OffsetInstruction;
  or: OrInstruction<Row>;
  and: AndInstruction<Row>;
  update: UpdateInstruction<Row>;
  delete: DeleteInstruction;
  select: SelectInstruction<Row>;
  returning: ReturningInstruction<Row>;
  nocache: NoCacheInstruction;
};

export type QueryInstruction<
  Row extends TableRow = TableRow,
  I extends keyof InstructionType<Row> = keyof InstructionType<Row>
> = {
  instruction: I;
} & InstructionType<Row>[I];

export interface WhereInstruction<Row extends TableRow = TableRow> {
  instruction: "where";
  field: keyof Row;
  operation: Operation;
  value: Operation extends "in" | "!in" | "contains" | "!contains"
    ? Row[keyof Row][]
    : Operation extends "between" | "!between"
    ? [Row[keyof Row], Row[keyof Row]]
    : Row[keyof Row];
}

export interface OrderByInstruction<Row extends TableRow = TableRow> {
  instruction: "orderBy";
  field: keyof Row;
  direction: "asc" | "desc";
}

export interface LimitInstruction {
  instruction: "limit";
  limit: number;
}

export interface OffsetInstruction {
  instruction: "offset";
  offset: number;
}

export interface OrInstruction<Row extends TableRow = TableRow> {
  instruction: "or";
  queries: QueryInstruction<Row>[];
}

export interface AndInstruction<Row extends TableRow = TableRow> {
  instruction: "and";
  queries: QueryInstruction<Row>[];
}

export interface UpdateInstruction<Row extends TableRow = TableRow> {
  instruction: "update";
  values?: Partial<Row>;
  fn?: (row: Row) => Row;
}

export interface DeleteInstruction {
  instruction: "delete";
}

export interface SelectInstruction<Row extends TableRow = TableRow> {
  instruction: "select";
  fields?: (keyof Row)[];
}

export interface ReturningInstruction<Row extends TableRow = TableRow> {
  instruction: "returning";
  fields?: (keyof Row)[];
}

export interface NoCacheInstruction {
  instruction: "nocache";
}

export type Operation =
  | "="
  | ">"
  | ">="
  | "<"
  | "<="
  | "!="
  | "between"
  | "!between"
  | "in"
  | "!in"
  | "contains"
  | "!contains";

export interface QueryBuilderInterface<Row extends TableRow = TableRow> {
  instructions: QueryInstruction<Row>[];
  terminator: string | undefined;
  where<Key extends keyof Row = keyof Row>(
    field: Key,
    operation: Operation,
    value: Row[Key][] | Row[Key]
  ): QueryBuilderInterface<Row>;
  orderBy(
    field: keyof Row,
    direction: "asc" | "desc"
  ): QueryBuilderInterface<Row>;
  limit(value: number): QueryBuilderInterface<Row>;
  offset(value: number): QueryBuilderInterface<Row>;
  and(fn: (qb: QueryBuilderInterface<Row>) => void): QueryBuilderInterface<Row>;
  or(fn: (qb: QueryBuilderInterface<Row>) => void): QueryBuilderInterface<Row>;
  update(fields: Partial<Row>): QueryBuilderInterface<Row>;
  nocache(): QueryBuilderInterface<Row>;
  update(
    values:
      | Partial<Row>
      | ((row: Row) => Promise<Exclude<Row, "id">> | Exclude<Row, "id">)
  ): QueryBuilderInterface<Row>;
  delete(): QueryBuilderInterface<Row>;
  select(fields?: (keyof Row)[]): QueryBuilderInterface<Row>;
  returning(fields?: (keyof Row)[]): QueryBuilderInterface<Row>;
  instructionsMatchRecord(record: Row): boolean;
  execute(): Promise<QueryResult<Row>>;
}

export interface QueryResult<Row = TableRow> {
  rows: Row[];
  first(): Row;
  filter(fn: (row: Row) => boolean): QueryResult<Row>;
  pick<Keys extends (keyof Row)[]>(
    fields: Keys
  ): QueryResult<Extract<Row, Keys>>;
  all(): Row[];
  count(): number;
}

export interface TableQueryInterface<
  Row extends TableRow = TableRow,
  Def extends TableDefinition<Row> = TableDefinition<Row>
> extends QueryBuilderInterface<Row> {
  table: TableInterface<Row, Def>;
  instructions: QueryInstruction<Row>[];
  execute(): Promise<QueryResult<Row>>;
}
