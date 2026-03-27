/**
 * A lightweight, composable async pipeline library.
 *
 * Chain stages into sequential pipelines with conditional execution guards
 * including `only`, `stop`, `not`, `check`/`and`/`or`, and URL route matching.
 *
 * @example Create and run a pipeline
 * ```ts
 * import Pipe, { process } from "@pd/pdpipe";
 *
 * // Define stages that transform an input object
 * const greet = (input: { name: string; greeting?: string }) => {
 *   input.greeting = `Hello, ${input.name}!`;
 * };
 *
 * // Use the process shorthand to run stages in sequence
 * const result = await process([greet], { name: "World" }, { steps: [] } as any);
 * console.log(result.greeting); // "Hello, World!"
 * ```
 *
 * @example Build a pipeline with Pipe and chain stages
 * ```ts
 * import Pipe from "@pd/pdpipe";
 *
 * const pipeline = Pipe([stage1, stage2], pipeConfig);
 * pipeline.pipe(stage3); // append additional stages
 * const output = await pipeline.process(input);
 * ```
 *
 * @module
 */

import type { Pipe as PipeType, Input, Stage } from "./pipedown.d.ts";
import Pipeline from "./pipeline.ts";
import { funcWrapper } from "./pdUtils.ts";

/**
 * Create a new {@linkcode Pipeline} from an array of stages and a pipe configuration.
 *
 * Each stage is wrapped with conditional-execution guards (only, stop, not,
 * check/and/or, routes) derived from the pipe's step configs before being
 * added to the pipeline.
 *
 * @param funcs - Array of stage functions to execute sequentially.
 * @param opts - Pipe definition containing step configs for guard logic.
 * @returns A {@linkcode Pipeline} instance ready to process input.
 */
export default function Pipe<I extends Input>(funcs: Stage<I>[], opts: PipeType): Pipeline<I> {
  const wrappedFuncs = funcWrapper(funcs, opts)
  return new Pipeline(wrappedFuncs);
}

/**
 * Convenience function that creates a pipeline and immediately processes input through it.
 *
 * Equivalent to `Pipe(steps, opts).process(input)`.
 *
 * @param steps - Array of stage functions to execute sequentially.
 * @param input - The initial input object threaded through each stage.
 * @param opts - Pipe definition containing step configs for guard logic.
 * @returns The input object after all stages have been applied.
 */
export async function process<I extends Input>(steps: ((input: I) => void)[], input: I, opts: PipeType): Promise<I> {
  return await Pipe<I>(steps, opts).process(input);
}
