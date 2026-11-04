// Test stand-in for the Workers runtime module `cloudflare:workers` (feature 023):
// just enough of `DurableObject` for the Arena room's unit tests, which pass
// their own fake `ctx` and `env`.
export class DurableObject<Env = unknown> {
  protected ctx: DurableObjectState;
  protected env: Env;
  constructor(ctx: DurableObjectState, env: Env) {
    this.ctx = ctx;
    this.env = env;
  }
}
