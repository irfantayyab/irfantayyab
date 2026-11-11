export const requestTimeout = 30_000;

export class RequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestError";
  }
}

function messageOf(error: unknown): string {
  if (error instanceof AggregateError && error.errors.length > 0) {
    return error.errors.map(messageOf).join("; ");
  }
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    return error.message || (typeof code === "string" ? code : error.name);
  }
  return String(error);
}

function reason(error: unknown) {
  if (error instanceof Error && error.name === "TimeoutError") {
    return `no answer within ${requestTimeout / 1000} seconds`;
  }
  if (error instanceof Error && error.cause instanceof Error) {
    return messageOf(error.cause);
  }
  return messageOf(error);
}

export type Answer<T = string> = {
  ok: boolean;
  status: number;
  body: T;
};

async function send<T>(
  fetcher: typeof fetch,
  url: string,
  init: RequestInit,
  read: (response: Response) => Promise<T>,
): Promise<Answer<T>> {
  try {
    const response = await fetcher(url, {
      ...init,
      signal: AbortSignal.timeout(requestTimeout),
    });
    return {
      ok: response.ok,
      status: response.status,
      body: await read(response),
    };
  } catch (error) {
    throw new RequestError(`${url} could not be reached: ${reason(error)}`);
  }
}

export function request(
  fetcher: typeof fetch,
  url: string,
  init: RequestInit = {},
): Promise<Answer> {
  return send(fetcher, url, init, (response) => response.text());
}

export function requestBytes(
  fetcher: typeof fetch,
  url: string,
): Promise<Answer<Uint8Array>> {
  return send(
    fetcher,
    url,
    {},
    async (response) => new Uint8Array(await response.arrayBuffer()),
  );
}
