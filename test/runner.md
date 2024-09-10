# Test Runner

```ts
import $ from "jsr:@david/dax"
```

## runSimpleConditional
Let's use dax to keep all out commands in one place
```ts
await $`deno run -A --unstable-kv ../../pipedown/pdCli/mod.ts build;
deno run -A testSimpleConditional.ts`
```

## runSimpleServer
Let's use dax to keep all out commands in one place
```ts
await $`deno run -A --unstable-kv ../../pipedown/pdCli/mod.ts build;
deno run -A testSimpleRequests.ts`
```

## runCheckChecks
Let's use dax to keep all out commands in one place
```ts
await $`deno run -A --unstable-kv ../../pipedown/pdCli/mod.ts build;
deno run -A testRouteChecks.ts`
```
