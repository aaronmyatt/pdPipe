"use strict";
import type { Stage, Input } from "./pipedown.d.ts";

/**
 * Sequential async pipeline executor. Chains stages via promise resolution,
 * passing each stage's output as the next stage's input.
 */
class Pipeline<I extends Input> {
  stages = [] as Stage<I>[];
  defaultArgs = {};

  constructor(presetStages: Stage<I>[] = [], defaultArgs = {}) {
    this.defaultArgs = defaultArgs;
    this.stages = presetStages || [];
  }

  /** Append a stage to the pipeline. Returns `this` for chaining. */
  pipe(stage: Stage<I>): Pipeline<I> {
    this.stages.push(stage);
    return this;
  }

  /** Execute all stages sequentially, threading the input through each. */
  process(args: I): Promise<I> {
    args = Object.assign({}, this.defaultArgs, args);

    if (this.stages.length === 0) {
      return Promise.resolve(args);
    }

    // Reduce stages into a single promise chain: stage1(args).then(stage2).then(stage3)...
    return this.stages.reduce(
      (chain, stage) => chain.then(stage),
      Promise.resolve(args) as Promise<I>,
    );
  }
}

export default Pipeline;
