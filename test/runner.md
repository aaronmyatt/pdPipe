# Test Runner

## run
Let's use dax to keep all out commands in one place
```ts
import $ from "jsr:@david/dax"

await $`deno run -A --unstable-kv ../../pipedown/pdCli/mod.ts build;
deno run -A testSimpleConditional.ts
`
