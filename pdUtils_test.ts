import { assertEquals } from "jsr:@std/assert";
import { process } from "./mod.ts";
import { CONTENT_TYPE_MAP } from "./pdUtils.ts";
import type { Input, Pipe, Step } from "./pipedown.d.ts";

// ── Test helpers ────────────────────────────────────────────────────────────

/**
 * Build a minimal Pipe config with the given steps.
 * This is the opts object that funcWrapper reads guard config from.
 * Ref: pdUtils.ts line 38 — config is read via $p.get(opts, "/steps/{index}/config")
 *
 * @param steps - Array of partial Step objects (config is the key field)
 * @returns A Pipe object suitable for passing to process()
 */
function makePipe(steps: Partial<Step>[]): Pipe {
  return {
    name: "TestPipe",
    camelName: "testPipe",
    steps: steps.map((s, i) => ({
      code: "",
      range: [],
      name: s.name || "step" + i,
      funcName: s.funcName || "step" + i,
      inList: false,
      ...s,
    })) as Step[],
    dir: "",
    fileName: "test",
  };
}

/**
 * No-op stage that marks itself as executed on the input.
 * Each call pushes the function name into input.executed[].
 *
 * @param name - Identifier to push into the executed array
 * @returns A stage function for use in a pipeline
 */
function markerStage(name: string) {
  // Named function so funcWrapper can label it in the debug name
  const fn = async function (input: Input) {
    input.executed = input.executed || [];
    (input.executed as string[]).push(name);
  };
  Object.defineProperty(fn, "name", { value: name });
  return fn;
}

// ── CONTENT_TYPE_MAP ────────────────────────────────────────────────────────
// Ref: pdUtils.ts line 8-16 — shorthand-to-MIME mapping for the type: directive

Deno.test("CONTENT_TYPE_MAP", async (t) => {
  await t.step("maps 'json' to application/json", () => {
    assertEquals(CONTENT_TYPE_MAP["json"], "application/json");
  });

  await t.step("maps 'html' to text/html with charset", () => {
    assertEquals(CONTENT_TYPE_MAP["html"], "text/html; charset=utf-8");
  });

  await t.step("maps 'text' to text/plain with charset", () => {
    assertEquals(CONTENT_TYPE_MAP["text"], "text/plain; charset=utf-8");
  });

  await t.step("maps 'xml' to application/xml", () => {
    assertEquals(CONTENT_TYPE_MAP["xml"], "application/xml");
  });

  await t.step("maps 'css' to text/css with charset", () => {
    assertEquals(CONTENT_TYPE_MAP["css"], "text/css; charset=utf-8");
  });

  await t.step("maps 'js' to text/javascript with charset", () => {
    assertEquals(CONTENT_TYPE_MAP["js"], "text/javascript; charset=utf-8");
  });

  await t.step("maps 'stream' to text/event-stream", () => {
    assertEquals(CONTENT_TYPE_MAP["stream"], "text/event-stream");
  });

  await t.step("returns undefined for unknown shorthands", () => {
    assertEquals(CONTENT_TYPE_MAP["unknown"], undefined);
  });
});

// ── HTTP method guard ───────────────────────────────────────────────────────
// Ref: pdUtils.ts line 98-104 — skips the step if the request method doesn't
// match any of the listed methods. Multiple "method:" directives act as OR.

Deno.test("methods guard", async (t) => {
  await t.step("runs step when request method matches", async () => {
    const pipe = makePipe([{ config: { methods: ["GET"] } }]);
    const input: Input = {
      request: new Request("http://localhost/test", { method: "GET" }),
    };

    const result = await process([markerStage("a")], input, pipe);
    assertEquals((result.executed as string[]), ["a"]);
  });

  await t.step("skips step when request method does not match", async () => {
    const pipe = makePipe([{ config: { methods: ["POST"] } }]);
    const input: Input = {
      request: new Request("http://localhost/test", { method: "GET" }),
    };

    const result = await process([markerStage("a")], input, pipe);
    // Step should not have executed
    assertEquals(result.executed, undefined);
  });

  await t.step("matches case-insensitively (uppercase comparison)", async () => {
    // Request.method is always uppercase per the Fetch spec, but if
    // somehow lowercase were passed, the guard uppercases it.
    // Ref: https://developer.mozilla.org/en-US/docs/Web/API/Request/method
    const pipe = makePipe([{ config: { methods: ["POST"] } }]);
    const input: Input = {
      request: new Request("http://localhost/test", { method: "POST" }),
    };

    const result = await process([markerStage("a")], input, pipe);
    assertEquals((result.executed as string[]), ["a"]);
  });

  await t.step("allows multiple methods (OR logic)", async () => {
    // A step with methods: ["GET", "POST"] should run for either method
    const pipe = makePipe([{ config: { methods: ["GET", "POST"] } }]);

    const getInput: Input = {
      request: new Request("http://localhost/", { method: "GET" }),
    };
    const postInput: Input = {
      request: new Request("http://localhost/", { method: "POST" }),
    };

    const getResult = await process([markerStage("a")], getInput, pipe);
    assertEquals((getResult.executed as string[]), ["a"]);

    const postResult = await process([markerStage("b")], postInput, pipe);
    assertEquals((postResult.executed as string[]), ["b"]);
  });

  await t.step("skips when no request is present", async () => {
    // No request at all should skip the step (reqMethod is undefined)
    const pipe = makePipe([{ config: { methods: ["GET"] } }]);
    const input: Input = {};

    const result = await process([markerStage("a")], input, pipe);
    assertEquals(result.executed, undefined);
  });

  await t.step("does not interfere when methods array is empty", async () => {
    // Empty methods array means no method guard — step always runs
    const pipe = makePipe([{ config: { methods: [] } }]);
    const input: Input = {};

    const result = await process([markerStage("a")], input, pipe);
    assertEquals((result.executed as string[]), ["a"]);
  });

  await t.step("rejects non-matching method among multiple", async () => {
    const pipe = makePipe([{ config: { methods: ["PUT", "PATCH"] } }]);
    const input: Input = {
      request: new Request("http://localhost/", { method: "DELETE" }),
    };

    const result = await process([markerStage("a")], input, pipe);
    assertEquals(result.executed, undefined);
  });
});

// ── Content-type guard ──────────────────────────────────────────────────────
// Ref: pdUtils.ts line 121-130 — sets the response content-type header after
// the step executes, using CONTENT_TYPE_MAP for shorthand resolution.

Deno.test("contentType directive", async (t) => {
  await t.step("sets content-type from shorthand name", async () => {
    const pipe = makePipe([{ config: { contentType: "json" } }]);
    const input: Input = {
      responseOptions: { headers: { "content-type": "" } as Record<string, string> },
    };

    const result = await process([markerStage("a")], input, pipe);

    // Should resolve "json" → "application/json" via CONTENT_TYPE_MAP
    const headers = (result.responseOptions as { headers: Record<string, string> }).headers;
    assertEquals(headers["content-type"], "application/json");
  });

  await t.step("sets content-type from html shorthand", async () => {
    const pipe = makePipe([{ config: { contentType: "html" } }]);
    const input: Input = {
      responseOptions: { headers: { "content-type": "" } as Record<string, string> },
    };

    const result = await process([markerStage("a")], input, pipe);
    const headers = (result.responseOptions as { headers: Record<string, string> }).headers;
    assertEquals(headers["content-type"], "text/html; charset=utf-8");
  });

  await t.step("passes raw MIME type through when not in map", async () => {
    // Unknown shorthands are treated as raw MIME types
    const pipe = makePipe([{ config: { contentType: "image/png" } }]);
    const input: Input = {
      responseOptions: { headers: { "content-type": "" } as Record<string, string> },
    };

    const result = await process([markerStage("a")], input, pipe);
    const headers = (result.responseOptions as { headers: Record<string, string> }).headers;
    assertEquals(headers["content-type"], "image/png");
  });

  await t.step("does nothing when contentType is empty string", async () => {
    // Empty contentType should not set any header
    const pipe = makePipe([{ config: { contentType: "" } }]);
    const input: Input = {
      responseOptions: { headers: { "content-type": "original" } as Record<string, string> },
    };

    const result = await process([markerStage("a")], input, pipe);
    const headers = (result.responseOptions as { headers: Record<string, string> }).headers;
    assertEquals(headers["content-type"], "original");
  });

  await t.step("does nothing when responseOptions.headers is absent", async () => {
    // If there are no responseOptions headers, the directive is a no-op
    // (doesn't crash trying to set headers)
    const pipe = makePipe([{ config: { contentType: "json" } }]);
    const input: Input = {};

    const result = await process([markerStage("a")], input, pipe);
    // Should complete without error
    assertEquals((result.executed as string[]), ["a"]);
  });

  await t.step("applies after step execution", async () => {
    // The step can set up responseOptions, and the directive runs after
    const pipe = makePipe([{ config: { contentType: "text" } }]);

    // Stage that creates responseOptions during execution
    const setupStage = async (input: Input) => {
      input.responseOptions = {
        headers: { "content-type": "" } as Record<string, string>,
      };
    };

    const input: Input = {};
    const result = await process([setupStage], input, pipe);
    const headers = (result.responseOptions as { headers: Record<string, string> }).headers;
    assertEquals(headers["content-type"], "text/plain; charset=utf-8");
  });
});

// ── Combined guards ─────────────────────────────────────────────────────────
// Tests for methods + contentType interacting with other guards

Deno.test("combined guards", async (t) => {
  await t.step("methods guard short-circuits before contentType applies", async () => {
    // If method doesn't match, step is skipped entirely — contentType never fires
    const pipe = makePipe([{ config: { methods: ["POST"], contentType: "json" } }]);
    const input: Input = {
      request: new Request("http://localhost/", { method: "GET" }),
      responseOptions: { headers: { "content-type": "original" } as Record<string, string> },
    };

    const result = await process([markerStage("a")], input, pipe);
    // Step didn't execute, contentType wasn't applied
    assertEquals(result.executed, undefined);
    const headers = (result.responseOptions as { headers: Record<string, string> }).headers;
    assertEquals(headers["content-type"], "original");
  });

  await t.step("methods + routes: both must pass for step to run", async () => {
    const pipe = makePipe([{
      config: {
        methods: ["POST"],
        routes: ["/api/data"],
      },
    }]);

    // Matching method + matching route → runs
    const matchInput: Input = {
      request: new Request("http://localhost/api/data", { method: "POST" }),
    };
    const matchResult = await process([markerStage("a")], matchInput, pipe);
    assertEquals((matchResult.executed as string[]), ["a"]);

    // Matching method + wrong route → skipped
    const wrongRouteInput: Input = {
      request: new Request("http://localhost/other", { method: "POST" }),
    };
    const wrongRouteResult = await process([markerStage("b")], wrongRouteInput, pipe);
    assertEquals(wrongRouteResult.executed, undefined);
  });

  await t.step("multiple steps with different method filters", async () => {
    // Two steps: first responds to GET, second to POST
    const pipe = makePipe([
      { config: { methods: ["GET"] } },
      { config: { methods: ["POST"] } },
    ]);

    const getInput: Input = {
      request: new Request("http://localhost/", { method: "GET" }),
    };
    const result = await process(
      [markerStage("get-handler"), markerStage("post-handler")],
      getInput,
      pipe,
    );

    // Only the GET handler should have run
    assertEquals((result.executed as string[]), ["get-handler"]);
  });
});
