import type { Input, Pipe, Stage, Step } from "./pipedown.d.ts";
import $p from "jsr:@pd/pointers@0.1.0";

// ── Content-type shorthand map ──
// Used by the "type:" DSL directive to resolve short names to full MIME types.
// If a value doesn't match any shorthand, it's treated as a raw MIME type.
// Ref: https://developer.mozilla.org/en-US/docs/Web/HTTP/MIME_types/Common_types
const CONTENT_TYPE_MAP: Record<string, string> = {
  json: "application/json",
  html: "text/html; charset=utf-8",
  text: "text/plain; charset=utf-8",
  xml: "application/xml",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  stream: "text/event-stream",
};

/**
 * Wraps each pipeline stage function with conditional-execution guards.
 *
 * For every step, the wrapper evaluates (in order):
 *   1. `only`  — run this step exclusively (skip all others)
 *   2. `stop`  — halt after a certain step index
 *   3. errors  — short-circuit if earlier steps accumulated errors
 *   4. `not`   — skip if any JSON-pointer condition is truthy
 *   5. `check`/`and`/`or` — boolean gate logic (see below)
 *   6. `routes` — URL-pattern matching for server mode
 *
 * If all guards pass, the original function is invoked inside a try/catch
 * that captures exceptions as structured errors on `input.errors[]`.
 */
function funcWrapper<I extends Input>(funcs: Stage<I>[], opts: Pipe) {
  opts.$p = $p;

  return funcs
    // Step 1: pair each function with its conditional config from the pipe definition
    .map((func, index: number): { func: Stage; config: Step["config"] } => {
      const config: Step["config"] = Object.assign(
        { checks: [], not: [], or: [], and: [], routes: [], methods: [], contentType: "", only: false, stop: false },
        $p.get(opts, "/steps/" + index + "/config"),
      );
      return { func, config };
    })
    // Step 2: wrap each function with guard logic
    .map(({ func, config }, index) =>
      async function (input: I) {
        // "only" mode: run exclusively the step at this index
        const only = config.only || input?.only;
        if (only && only !== index) return input;

        // "stop" mode: skip steps beyond the stop index
        const stop = config.stop || input?.stop;
        if (index > stop) return input;

        // Bail on accumulated errors from previous steps
        if (input?.errors && input.errors.length > 0) return input;

        // "not" guard: skip this step if any pointer resolves truthy
        const shouldBeFalsy = config.not.map((check: string) =>
          $p.get(input, check)
        ).some((check: boolean) => check);
        if (shouldBeFalsy) return input;

        // Boolean gate: resolve each pointer to [key, value] pair
        const checker = (check: string): string[] => {
          return [check.split("/").pop() || check, $p.get(input, check)];
        };

        // "and" uses .every() (all must be truthy); "check" alone uses .some() (any truthy)
        const validator: "some" | "every" = config.and.length ? "every" : "some";
        const conditions: string[][] = config.checks.map(checker).concat(config.and.map(checker));
        const orConditions = config.or.map(checker);

        if (conditions.length) {
          const mainPass = conditions[validator](([_key, value]) => !!value);
          const orPass = orConditions.some(([_key, value]: string[]) => !!value);

          if (mainPass) {
            $p.set(opts, "/checks", Object.fromEntries(conditions));
          } else if (orPass) {
            $p.set(opts, "/checks", Object.fromEntries(orConditions));
          } else {
            return input; // No conditions met — skip this step
          }
        }

        // Route matching: skip if no URL patterns match the incoming request
        // Ref: https://developer.mozilla.org/en-US/docs/Web/API/URLPattern
        if (config.routes.length) {
          const route = config.routes
            .map((route: string) => new URLPattern({ pathname: route }))
            .find((route: URLPattern) => route.test(input.request?.url));

          if (!route) return input;
          input.route = route.exec(input.request.url);
        }

        // HTTP method guard: skip this step if the request method doesn't match
        // any of the listed methods. Multiple "method:" directives on one step
        // act as OR (e.g., method: POST + method: PUT → runs for either).
        // Ref: https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods
        if (config.methods && config.methods.length > 0) {
          const reqMethod = input.request?.method?.toUpperCase();
          if (!reqMethod || !config.methods.includes(reqMethod)) return input;
        }

        // Execute the step, capturing any thrown exception as a structured error
        try {
          await func(input, opts);
        } catch (e: unknown) {
          input.errors = input.errors || [];
          const err = e as Error;
          input.errors.push({
            message: err.message,
            stack: err.stack,
            name: err.name,
            func: func.name,
          });
        }

        // Content-type directive: set the response content-type after the step
        // executes. This allows the step to override it if needed (the directive
        // provides a default, not an absolute). Supports shorthand names ("html",
        // "json") or raw MIME types ("image/png").
        // Ref: CONTENT_TYPE_MAP defined above
        if (config.contentType) {
          const resolved = CONTENT_TYPE_MAP[config.contentType] || config.contentType;
          if (input.responseOptions?.headers) {
            (input.responseOptions as { headers: Record<string, string> }).headers["content-type"] = resolved;
          }
        }

        return input;
      }
    )
    // Step 3: label each wrapped function with "{index}-{originalName}" for debugging
    .map((func, index) => {
      Object.defineProperty(func, "name", {
        value: `${index}-${funcs[index].name}`,
      });
      return func;
    });
}

/**
 * Wraps pipeline stage functions with conditional-execution guards.
 *
 * Each stage is evaluated against its step config for `only`, `stop`, error
 * short-circuit, `not`, `check`/`and`/`or` boolean gates, and URL `routes`
 * matching. Exceptions thrown by a stage are captured as structured errors
 * on `input.errors[]`.
 *
 * @param funcs - Array of raw stage functions.
 * @param opts - Pipe definition containing per-step guard configurations.
 * @returns Wrapped stage functions with guard logic applied.
 */
export { funcWrapper, CONTENT_TYPE_MAP };
export default funcWrapper;
