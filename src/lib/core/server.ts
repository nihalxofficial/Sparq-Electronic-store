"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { getToken } from "./session";

const API_URL: string = process.env.NEXT_PUBLIC_API_URL as string;

/** A hung API must not hold the whole page render open until the platform kills it. */
const REQUEST_TIMEOUT_MS = 10_000;

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Reads the body as JSON when the API sent JSON, otherwise there is nothing to return. */
const readJson = async (res: Response) => {
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await res.json();
  }

  return null;
};

/** Redirects unauthenticated / forbidden users, and surfaces API errors as throws. */
const handleResponse = async (res: Response) => {
  if (res.status === 401) redirect("/auth/login");
  if (res.status === 403) redirect("/forbidden");

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || `Request failed with status ${res.status}`);
  }

  return readJson(res);
};

/** Bearer header for the current session, or an empty object when there is none. */
const authHeaders = async (): Promise<HeadersInit> => {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Read-only request, used by `lib/api`.
 *
 * Never throws: a transport failure or a 401/403 resolves to null so pages can
 * render an empty state instead of crashing the render.
 */
export const serverFetch = async (path: string, requireAuth: boolean = false) => {
  if (!API_URL) {
    console.error("NEXT_PUBLIC_API_URL is not set — cannot read", path);
    return null;
  }

  try {
    const headers = requireAuth ? await authHeaders() : {};

    const res = await fetch(`${API_URL}${path}`, {
      cache: "no-store",
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (res.status === 401 || res.status === 403) {
      return null;
    }

    return await handleResponse(res);
  } catch (err) {
    // A redirect, a notFound or the framework's own "this route is dynamic"
    // signal belongs to Next, not to this helper. Swallowing it froze pages
    // into static copies and surfaced later as the ISR error screen.
    unstable_rethrow(err);
    console.error("serverFetch error for path", path, ":", (err as Error).message);
    return null;
  }
};

/**
 * Write request, used by `lib/action`. Mutations always require a session, so
 * a missing token redirects to the login page before the request is sent.
 *
 * `explainForbidden` is for the desks where a 403 is an answer rather than a
 * break-in: a plan limit or a suspended shop has a reason the seller needs to
 * read, so it comes back as a failed result instead of the forbidden page.
 */
export const serverMutation = async (
  path: string,
  data: unknown = "",
  method: HttpMethod = "POST",
  options?: { explainForbidden?: boolean; timeoutMs?: number }
) => {
  const token = await getToken();
  if (!token) redirect("/auth/login");

  const timeoutMs = options?.timeoutMs ?? REQUEST_TIMEOUT_MS;

  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (options?.explainForbidden && res.status === 403) {
      const body = await res.json().catch(() => ({}));
      return {
        success: false,
        message: body?.message || "This action is not allowed right now",
      };
    }

    return await handleResponse(res);
  } catch (err) {
    unstable_rethrow(err);
    const error = err as Error;
    const isTimeout =
      error?.name === "TimeoutError" ||
      error?.name === "AbortError" ||
      /timeout|aborted/i.test(error?.message || "");
    console.error("fetch failed:", error?.message);
    return {
      success: false,
      isTimeout,
      message: isTimeout
        ? "The request timed out. Please check your connection and try again."
        : error?.message || "Request failed",
    };
  }
};
