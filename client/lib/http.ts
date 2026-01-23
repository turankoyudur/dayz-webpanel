/**
 * Small fetch wrapper for the DayZ panel.
 *
 * - Uses relative /api routes (same origin)
 * - Converts non-2xx responses into typed errors
 */
export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  // Determine the current instanceId from localStorage (if set).
  // Persisting instance selection in localStorage allows the panel to send the selected
  // instance identifier with every API call. This header is optional; if there is no
  // instance selected then the server falls back to its own active instance.
  let instanceHeader: Record<string, string> = {};
  try {
    if (typeof window !== "undefined") {
      const id = window.localStorage.getItem("dz.instanceId");
      if (id) {
        instanceHeader = { "X-Instance-Id": id };
      }
    }
  } catch {
    // localStorage may not be available (SSR); ignore
  }
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(instanceHeader),
      ...(options?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let payload: any = null;
    try {
      payload = await res.json();
    } catch {
      // ignore
    }
    const code = payload?.error?.code ?? "E_HTTP";
    const message = payload?.error?.message ?? `Request failed: ${res.status}`;
    const err = new Error(message) as Error & { code?: string; status?: number };
    err.code = code;
    err.status = res.status;
    throw err;
  }

  return (await res.json()) as T;
}

export function apiPost<T>(path: string, body?: unknown) {
  return api<T>(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiPut<T>(path: string, body?: unknown) {
  return api<T>(path, {
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiPatch<T>(path: string, body?: unknown) {
  return api<T>(path, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiDelete<T>(path: string) {
  return api<T>(path, {
    method: "DELETE",
  });
}