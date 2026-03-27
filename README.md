# @pd/pdpipe

A lightweight, composable async pipeline library for Deno.

Chain stage functions into sequential pipelines with built-in conditional
execution guards: `only`, `stop`, `not`, `check`/`and`/`or`, and URL route
matching.

## Usage

```ts
import Pipe, { process } from "@pd/pdpipe";

// Define stages that transform an input object
const addGreeting = (input: { name: string; greeting?: string }) => {
  input.greeting = `Hello, ${input.name}!`;
};

const shout = (input: { greeting?: string }) => {
  input.greeting = input.greeting?.toUpperCase();
};

// Run stages in sequence with the process shorthand
const result = await process(
  [addGreeting, shout],
  { name: "World" },
  { steps: [] } as any,
);

console.log(result.greeting); // "HELLO, WORLD!"
```

### Building a pipeline incrementally

```ts
import Pipe from "@pd/pdpipe";

const pipeline = Pipe([stage1, stage2], pipeConfig);
pipeline.pipe(stage3); // append more stages
const output = await pipeline.process({ name: "example" });
```

## License

MIT
