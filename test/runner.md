# Test Runner

```ts
import $ from "jsr:@david/dax"
```

## runSimpleConditional
Let's use dax to keep all out commands in one place
```ts
await $`deno run -A --unstable-kv ../../pipedown/pdCli/mod.ts build;
deno run -A --import-map ./importmap.json testSimpleConditional.ts`
```

## runSimpleServer
Let's use dax to keep all out commands in one place
```ts
await $`deno run -A --unstable-kv ../../pipedown/pdCli/mod.ts build;
deno run -A --import-map ./importmap.json testSimpleRequests.ts`
```

## runCheckChecks
Let's use dax to keep all out commands in one place
```ts
await $`deno run -A --unstable-kv ../../pipedown/pdCli/mod.ts build;
deno run -A --import-map ./importmap.json testRouteChecks.ts`
```
