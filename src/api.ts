import { useEffect, useState } from "react";
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
  timeoutMs = 15_000,
): Promise<T> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-Peti-Request": "1",
      ...options.headers,
    },
    signal: options.signal
      ? AbortSignal.any([options.signal, timeout])
      : timeout,
  });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 && path !== "/me")
      window.dispatchEvent(new Event("peti:session-expired"));
    throw new ApiError(data.code, data.error, response.status);
  }
  return data;
}
export function useResource<T>(path: string | null, body?: unknown) {
  const [state, setState] = useState<{
    data: T | null;
    error: unknown;
    loading: boolean;
  }>({ data: null, error: null, loading: !!path });
  const [revision, setRevision] = useState(0);
  const serialized = body === undefined ? undefined : JSON.stringify(body);
  useEffect(() => {
    const controller = new AbortController();
    if (!path) {
      setState({ data: null, error: null, loading: false });
      return;
    }
    setState({ data: null, error: null, loading: true });
    api<T>(path, {
      signal: controller.signal,
      ...(serialized ? { method: "POST", body: serialized } : {}),
    })
      .then((data) => {
        if (!controller.signal.aborted)
          setState({ data, error: null, loading: false });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ data: null, error, loading: false });
      });
    return () => controller.abort();
  }, [path, serialized, revision]);
  return { ...state, reload: () => setRevision((r) => r + 1) };
}
