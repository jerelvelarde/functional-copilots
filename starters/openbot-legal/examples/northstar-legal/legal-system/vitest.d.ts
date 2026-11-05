// The copied web-app tests in lib/ import from "vitest", as they do in the web app. `bun test` runs
// them on its own runner; this tells the type checker the same thing, so the copies stay unchanged.
declare module "vitest" {
  export * from "bun:test";
}
