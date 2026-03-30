# @pd/pdpipe

A lightweight, composable async pipeline library for Deno.

Chain stage functions into sequential pipelines with built-in conditional
execution guards: `only`, `stop`, `not`, `check`/`and`/`or`, URL route
matching, HTTP method filtering, and content-type directives.

## Install

```ts
import Pipe, { process } from "jsr:@pd/pdpipe";
```

## Quick Start

```ts
import { process } from "jsr:@pd/pdpipe";
import type { Input, Pipe } from "jsr:@pd/pdpipe/pipedown.d.ts";

// Define stages that transform an input object.
// Each stage receives `input` and mutates it — the same object
// flows through every stage in sequence.
const addGreeting = (input: { name: string; greeting?: string }) => {
  input.greeting = `Hello, ${input.name}!`;
};

const shout = (input: { greeting?: string }) => {
  input.greeting = input.greeting?.toUpperCase();
};

// Minimal pipe config — steps array tells the guard wrapper
// which conditional config applies to each stage (by index).
const pipe = {
  name: "GreetPipe",
  camelName: "greetPipe",
  steps: [
    { code: "", range: [], name: "addGreeting", funcName: "addGreeting", inList: false },
    { code: "", range: [], name: "shout", funcName: "shout", inList: false },
  ],
  dir: "",
  fileName: "greet",
} satisfies Pipe;

const result = await process(
  [addGreeting, shout],
  { name: "World" },
  pipe,
);

console.log(result.greeting); // "HELLO, WORLD!"
```

## Building Pipelines Incrementally

Use the `Pipe` constructor to build a pipeline step by step. The `.pipe()`
method appends stages and returns `this` for chaining.

```ts
import Pipe from "jsr:@pd/pdpipe";

const pipeline = Pipe([], pipeConfig);

pipeline
  .pipe(async (input) => { input.value = 1; return input; })
  .pipe(async (input) => { input.value = (input.value as number) * 2; return input; })
  .pipe(async (input) => { input.value = (input.value as number) + 3; return input; });

const result = await pipeline.process({});
console.log(result.value); // 5  →  (1 * 2) + 3
```

## Conditional Execution Guards

Every stage is wrapped with guards derived from its step config. Guards are
evaluated in order — if any guard fails, the stage is skipped and the input
passes through unchanged.

### Guard Evaluation Order

1. **`only`** — run this step exclusively (skip all others)
2. **`stop`** — halt processing after this step index
3. **errors** — short-circuit if `input.errors` is non-empty
4. **`not`** — skip if any JSON-pointer path resolves to a truthy value
5. **`check`/`and`/`or`** — boolean gate logic on JSON-pointer paths
6. **`routes`** — URL pattern matching (server mode)
7. **`methods`** — HTTP method filtering

### `check` / `and` / `or` — Boolean Gates

JSON pointer paths on the `input` object control whether a step runs:

```ts
import { process } from "jsr:@pd/pdpipe";

// Stage that only runs when checks pass
const validate = async (input) => {
  input.validated = true;
};

// Config: run if /userId is truthy AND /verified is truthy
const pipe = makePipe([{
  config: {
    checks: ["/userId"],     // at least one check must be truthy
    and: ["/verified"],      // ALL and-conditions must be truthy
  },
}]);

// Passes — both userId and verified are truthy
await process([validate], { userId: "123", verified: true }, pipe);
// → { userId: "123", verified: true, validated: true }

// Skipped — verified is falsy
await process([validate], { userId: "123", verified: false }, pipe);
// → { userId: "123", verified: false }  (validated is absent)
```

- **`checks`** — at least one must be truthy (OR logic)
- **`and`** — ALL must be truthy
- **`or`** — any one suffices (combined with checks via OR)
- **`not`** — ALL must be falsy (step skipped if any is truthy)

### `routes` — URL Pattern Matching

Match incoming request URLs against [URLPattern](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern) patterns. Route parameters are captured in `input.route.pathname.groups`:

```ts
import { process } from "jsr:@pd/pdpipe";

const getUser = async (input) => {
  const userId = input.route.pathname.groups.id;
  input.body = { user: userId };
};

const pipe = makePipe([{
  config: { routes: ["/api/users/:id"] },
}]);

const result = await process(
  [getUser],
  { request: new Request("http://localhost/api/users/42") },
  pipe,
);

console.log(result.body); // { user: "42" }
```

### `methods` — HTTP Method Filtering

Filter steps by HTTP method. Multiple methods act as OR:

```ts
import { process } from "jsr:@pd/pdpipe";

const handlePost = async (input) => {
  input.handled = "POST";
};

// Only runs for POST requests
const pipe = makePipe([{
  config: { methods: ["POST"] },
}]);

// POST request → step runs
const postResult = await process(
  [handlePost],
  { request: new Request("http://localhost/api/data", { method: "POST" }) },
  pipe,
);
console.log(postResult.handled); // "POST"

// GET request → step skipped
const getResult = await process(
  [handlePost],
  { request: new Request("http://localhost/api/data", { method: "GET" }) },
  pipe,
);
console.log(getResult.handled); // undefined
```

### `contentType` — Response Content-Type

Set the response `content-type` header after step execution. Supports shorthand names or raw MIME types:

| Shorthand | MIME Type |
|-----------|-----------|
| `json` | `application/json` |
| `html` | `text/html; charset=utf-8` |
| `text` | `text/plain; charset=utf-8` |
| `xml` | `application/xml` |
| `css` | `text/css; charset=utf-8` |
| `js` | `text/javascript; charset=utf-8` |
| `stream` | `text/event-stream` |

```ts
const pipe = makePipe([{
  config: { contentType: "json" },
}]);

const result = await process(
  [async (input) => { input.body = { ok: true }; }],
  { responseOptions: { headers: { "content-type": "" } } },
  pipe,
);

// content-type is now "application/json"
```

## Error Handling

Exceptions thrown by a stage are caught and stored as structured errors on
`input.errors[]`. The pipeline **continues** executing subsequent stages
(unless those stages check for errors):

```ts
import { process } from "jsr:@pd/pdpipe";

const failingStage = async (input) => {
  throw new Error("something went wrong");
};

const recoveryStage = async (input) => {
  if (input.errors?.length) {
    input.recovered = true;
  }
};

const pipe = makePipe([{}, {}]);

const result = await process(
  [failingStage, recoveryStage],
  {},
  pipe,
);

console.log(result.errors[0].message); // "something went wrong"
// Note: recoveryStage did NOT run because the default error guard
// short-circuits when input.errors is non-empty
```

> **Note:** By default, accumulated errors cause subsequent stages to be
> skipped (guard #3). If you need error recovery, handle errors within
> a stage that runs before the error guard triggers, or structure your
> pipeline accordingly.

## API Reference

### `Pipe(stages, opts)`

Creates a new `Pipeline` instance. Each stage is wrapped with conditional
execution guards based on the corresponding step config in `opts.steps`.

- **`stages`** — `Stage[]` — Array of `(input, opts) => Promise<input> | void`
- **`opts`** — `Pipe` — Pipeline definition with `steps[]` containing guard configs
- **Returns** — `Pipeline` instance with `.pipe()` and `.process()` methods

### `process(stages, input, opts)`

Convenience function. Equivalent to `Pipe(stages, opts).process(input)`.

- **`stages`** — `Stage[]` — Array of stage functions
- **`input`** — `Input` — Initial input object (shallow-copied before processing)
- **`opts`** — `Pipe` — Pipeline definition
- **Returns** — `Promise<Input>` — The input object after all stages

### `Pipeline`

Class with:
- **`.pipe(stage)`** — Append a stage, returns `this` for chaining
- **`.process(input)`** — Execute all stages sequentially, returns `Promise<Input>`

### Types

```ts
// The data object that flows through the pipeline
type Input = {
  [key: string]: unknown;
  request?: Request;
  response?: Response;
  errors?: PDError[];
};

// A single pipeline stage function
type Stage<T> = (input: T, opts: Pipe) => Promise<T> | void;

// Step guard configuration
type Step = {
  code: string;
  range: number[];
  name: string | number;
  funcName: string;
  inList: boolean;
  config?: {
    checks?: string[];     // JSON pointer paths (OR logic)
    or?: string[];          // Additional OR conditions
    and?: string[];         // ALL must be truthy
    not?: string[];         // ALL must be falsy (skip if any truthy)
    routes?: string[];      // URLPattern pathnames
    methods?: string[];     // HTTP methods (e.g., ["GET", "POST"])
    contentType?: string;   // Response MIME shorthand or raw type
    flags?: string[];       // CLI flag checks
    only?: number;          // Run only this step index
    stop?: number;          // Stop after this step index
  };
};
```

## Testing

```bash
deno test
```

## License

MIT
