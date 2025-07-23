import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getAuthHeaders } from "./supabaseClient";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    const error = new Error(`${res.status}: ${text}`);
    (error as any).status = res.status;
    throw error;
  }
}

export async function apiRequest(
  url: string,
  options: RequestInit = {},
): Promise<any> {
  const authHeaders = await getAuthHeaders();
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...authHeaders,
    ...options.headers,
  };

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res.json(); // Return parsed JSON to match Animation.tsx expectations
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers: authHeaders,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});