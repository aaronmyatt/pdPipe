import { assertEquals } from "jsr:@std/assert";
import Pipeline from "./pipeline.ts";
import type { Input } from "./pipedown.d.ts";

type TestInput = Input & { value?: number; log?: string[] };

Deno.test("Pipeline", async (t) => {
  await t.step("returns input unchanged when no stages", async () => {
    const pipe = new Pipeline<TestInput>();
    const result = await pipe.process({ value: 42 });
    assertEquals(result.value, 42);
  });

  await t.step("executes a single stage", async () => {
    const pipe = new Pipeline<TestInput>([
      async (input) => { input.value = 10; return input; },
    ]);
    const result = await pipe.process({});
    assertEquals(result.value, 10);
  });

  await t.step("chains multiple stages in order", async () => {
    const pipe = new Pipeline<TestInput>([
      async (input) => { input.log = ["a"]; return input; },
      async (input) => { input.log!.push("b"); return input; },
      async (input) => { input.log!.push("c"); return input; },
    ]);
    const result = await pipe.process({});
    assertEquals(result.log, ["a", "b", "c"]);
  });

  await t.step("threads output of one stage into the next", async () => {
    const pipe = new Pipeline<TestInput>([
      async (input) => { input.value = 1; return input; },
      async (input) => { input.value = (input.value || 0) * 2; return input; },
      async (input) => { input.value = (input.value || 0) + 3; return input; },
    ]);
    const result = await pipe.process({});
    assertEquals(result.value, 5); // (1 * 2) + 3
  });

  await t.step("merges defaultArgs into input", async () => {
    const pipe = new Pipeline<TestInput>(
      [async (input) => input],
      { value: 99 },
    );
    const result = await pipe.process({});
    assertEquals(result.value, 99);
  });

  await t.step("input overrides defaultArgs", async () => {
    const pipe = new Pipeline<TestInput>(
      [async (input) => input],
      { value: 99 },
    );
    const result = await pipe.process({ value: 1 });
    assertEquals(result.value, 1);
  });

  await t.step("pipe() appends stages and allows chaining", async () => {
    const pipe = new Pipeline<TestInput>();
    pipe
      .pipe(async (input) => { input.value = 1; return input; })
      .pipe(async (input) => { input.value = (input.value || 0) + 1; return input; });
    const result = await pipe.process({});
    assertEquals(result.value, 2);
  });

  await t.step("handles synchronous-style stages that return input", async () => {
    // Stages wrapped in async still work even if body is sync
    const pipe = new Pipeline<TestInput>([
      async (input) => { input.value = 7; return input; },
    ]);
    const result = await pipe.process({});
    assertEquals(result.value, 7);
  });

  await t.step("does not mutate original input object", async () => {
    const original: TestInput = { value: 1 };
    const pipe = new Pipeline<TestInput>([
      async (input) => { input.value = 999; return input; },
    ]);
    await pipe.process(original);
    // Pipeline uses Object.assign({}, defaultArgs, args) — creates a new object
    assertEquals(original.value, 1);
  });
});
