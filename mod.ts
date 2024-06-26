import type { Pipe as PipeType, Input, Stage } from "./pipedown.d.ts";
import Pipeline from "./pipeline.ts";
import { funcWrapper } from "./pdUtils.ts";

export default function Pipe<I extends Input>(funcs: Stage<I>[], opts: PipeType): Pipeline<I> {
  const wrappedFuncs = funcWrapper(funcs, opts)
  return new Pipeline(wrappedFuncs);
}

export async function process<I extends Input>(steps: ((input: I) => void)[], input: I, opts: PipeType): Promise<I> {
  return await Pipe<I>(steps, opts).process(input);
}
