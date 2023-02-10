import { TableDefinition, TableInterface, TableRow } from "./table";

export type InstructionType = {
  where: WhereInstruction;
  orderBy: OrderByInstruction;
  limit: LimitInstruction;
  offset: OffsetInstruction;
  or: OrInstruction;
  and: AndInstruction;
  update: UpdateInstruction;
  delete: DeleteInstruction;
  select: SelectInstruction;
  returning: ReturningInstruction;
};

export type QueryInstruction<
  I extends keyof InstructionType = keyof InstructionType
> = {
  instruction: I;
} & InstructionType[I];

export interface WhereInstruction {
  instruction: "where";
  field: string;
  operation: Operation;
  value: any;
}

export interface OrderByInstruction {
  instruction: "orderBy";
  field: string;
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

export interface OrInstruction {
  instruction: "or";
  queries: QueryInstruction[];
}

export interface AndInstruction {
  instruction: "and";
  queries: QueryInstruction[];
}

export interface UpdateInstruction {
  instruction: "update";
  values: Record<string, any>;
}

export interface DeleteInstruction {
  instruction: "delete";
}

export interface SelectInstruction {
  instruction: "select";
  fields?: string[];
}

export interface ReturningInstruction {
  instruction: "returning";
  fields?: string[];
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
  | "!in";

export interface QueryBuilderInterface<Row extends TableRow = TableRow> {
  instructions: QueryInstruction[];
  where(field: string, operation: Operation, value: any): QueryBuilderInterface;
  orderBy(field: string, direction: "asc" | "desc"): QueryBuilderInterface;
  limit(value: number): QueryBuilderInterface;
  offset(value: number): QueryBuilderInterface;
  and(fn: (qb: QueryBuilderInterface) => void): QueryBuilderInterface;
  or(fn: (qb: QueryBuilderInterface) => void): QueryBuilderInterface;
  update(fields: Partial<Row>): QueryBuilderInterface;
  select(fields: (keyof Row)[]): QueryBuilderInterface;
  delete(): QueryBuilderInterface;
}

export interface QueryResult<Row = TableRow> {
  rows: Row[];
  first(): Row;
  filter(fn: (row: Row) => boolean): QueryResult<Row>;
  pick<Keys extends (keyof Row)[]>(
    fields: Keys
  ): QueryResult<Extract<Row, Keys>>;
  all(): Row[];
}

export interface TableQueryInterface<
  Row extends TableRow = TableRow,
  Def extends TableDefinition = TableDefinition
> extends QueryBuilderInterface {
  table: TableInterface<Row, Def>;
  instructions: QueryInstruction[];
  execute(): Promise<QueryResult<Row>>;
}
