"use strict";
import type { Stage, Input } from "./pipedown.d.ts";

/**
 * Sequential async pipeline executor.
 *
 * Chains stages via promise resolution, passing each stage's output as the
 * next stage's input. Stages are executed in order and can be appended
 * dynamically with {@linkcode Pipeline.pipe}.
 *
 * @typeParam I - The input type flowing through the pipeline, must extend {@linkcode Input}.
 */
class Pipeline<I extends Input> {
  /** The ordered list of stages to execute. */
  stages = [] as Stage<I>[];
  /** Default arguments merged into the input before processing. */
  defaultArgs = {};

  /**
   * Create a new Pipeline.
   *
   * @param presetStages - Initial stages to include in the pipeline.
   * @param defaultArgs - Default values merged into the input at process time.
   */
  constructor(presetStages: Stage<I>[] = [], defaultArgs = {}) {
    this.defaultArgs = defaultArgs;
    this.stages = presetStages || [];
  }

  /**
   * Append a stage to the pipeline.
   *
   * @param stage - The stage function to add.
   * @returns `this` for chaining.
   */
  pipe(stage: Stage<I>): Pipeline<I> {
    this.stages.push(stage);
    return this;
  }

  /**
   * Execute all stages sequentially, threading the input through each.
   *
   * @param args - The initial input object.
   * @returns The input object after all stages have been applied.
   */
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
