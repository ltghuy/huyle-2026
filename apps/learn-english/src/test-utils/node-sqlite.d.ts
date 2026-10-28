// The slice of Node's built-in `node:sqlite` (Node 22.5+) that `sqlite-d1.ts`
// uses. The workspace pins `@types/node` to 20, which predates the module.
declare module "node:sqlite" {
  export type SQLInputValue = null | number | bigint | string | Uint8Array;
  export interface StatementSync {
    all(...params: SQLInputValue[]): unknown[];
    get(...params: SQLInputValue[]): unknown;
    run(...params: SQLInputValue[]): { changes: number | bigint; lastInsertRowid: number | bigint };
  }
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
