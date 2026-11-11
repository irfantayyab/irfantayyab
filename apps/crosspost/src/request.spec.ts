import { describe, expect, it } from "vitest";
import { request, requestTimeout } from "./request.ts";

const url = "https://a.dev/feed.xml";

function failing(error: unknown) {
  return (async () => {
    throw error;
  }) as typeof fetch;
}

describe("request", () => {
  it("returns the answer's status and body", async () => {
    const fetcher = (async () =>
      new Response("hello", { status: 201 })) as typeof fetch;
    expect(await request(fetcher, url)).toEqual({
      ok: true,
      status: 201,
      body: "hello",
    });
  });

  it("names the address and the cause when it cannot connect", async () => {
    const fetcher = failing(
      new TypeError("fetch failed", {
        cause: new Error("getaddrinfo ENOTFOUND a.dev"),
      }),
    );
    await expect(request(fetcher, url)).rejects.toThrow(
      `${url} could not be reached: getaddrinfo ENOTFOUND a.dev`,
    );
  });

  it("names every address refused when a host has several", async () => {
    const fetcher = failing(
      new TypeError("fetch failed", {
        cause: new AggregateError(
          [
            new Error("connect ECONNREFUSED ::1:443"),
            new Error("connect ECONNREFUSED 127.0.0.1:443"),
          ],
          "",
        ),
      }),
    );
    await expect(request(fetcher, url)).rejects.toThrow(
      `${url} could not be reached: connect ECONNREFUSED ::1:443; connect ECONNREFUSED 127.0.0.1:443`,
    );
  });

  it("falls back to the error's code when it has no message", async () => {
    const cause = Object.assign(new Error(""), { code: "ECONNRESET" });
    const fetcher = failing(new TypeError("fetch failed", { cause }));
    await expect(request(fetcher, url)).rejects.toThrow(
      `${url} could not be reached: ECONNRESET`,
    );
  });

  it("gives up after its time limit, with the signal it passed", async () => {
    let signal: AbortSignal | null | undefined;
    const fetcher = (async (_: string, init: RequestInit = {}) => {
      signal = init.signal;
      throw new DOMException("The operation timed out.", "TimeoutError");
    }) as typeof fetch;
    await expect(request(fetcher, url)).rejects.toThrow(
      `${url} could not be reached: no answer within ${requestTimeout / 1000} seconds`,
    );
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it("names the address when the body stalls past the limit", async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("<rss>"));
        controller.error(
          new DOMException("The operation timed out.", "TimeoutError"),
        );
      },
    });
    const fetcher = (async () => new Response(body)) as typeof fetch;
    await expect(request(fetcher, url)).rejects.toThrow(
      `${url} could not be reached: no answer within ${requestTimeout / 1000} seconds`,
    );
  });
});
