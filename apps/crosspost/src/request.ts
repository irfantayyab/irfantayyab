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

export type Answer = {
  ok: boolean;
  status: number;
  text: string;
};

export async function request(
  fetcher: typeof fetch,
  url: string,
  init: RequestInit = {},
): Promise<Answer> {
  try {
    const response = await fetcher(url, {
      ...init,
      signal: AbortSignal.timeout(requestTimeout),
    });
    return {
      ok: response.ok,
      status: response.status,
      text: await response.text(),
    };
  } catch (error) {
    throw new RequestError(`${url} could not be reached: ${reason(error)}`);
  }
}
