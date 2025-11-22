
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

// Simple token-based auth helpers
export function logout() {
  localStorage.removeItem("contractor_token");
  localStorage.removeItem("contractor_user");
  document.cookie = "contractor_session=; Max-Age=0; path=/;";
  window.location.href = "/contractor-login-simple.html";
}

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = '/contractor-login' } =
    options ?? {};
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logoutCallback = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      // Clear localStorage tokens
      localStorage.removeItem("contractor_token");
      localStorage.removeItem("contractor_user");
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
      // Redirect to login page after logout
      window.location.href = '/contractor-login-simple.html';
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    localStorage.setItem(
      "manus-runtime-user-info",
      JSON.stringify(meQuery.data)
    );
    return {
      user: meQuery.data ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  // Auto-redirect when not logged in
  useEffect(() => {
    const token = localStorage.getItem("contractor_token");
    if (!token && meQuery.status === "success" && !meQuery.data) {
      // Only redirect if we're on a protected page
      const publicPaths = ["/contractor-login", "/contractor-login-simple.html", "/contractor-form"];
      const isPublicPath = publicPaths.some(path => window.location.pathname.includes(path));
      if (!isPublicPath) {
        window.location.href = "/contractor-login-simple.html";
      }
    }
  }, [meQuery.status, meQuery.data]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout: logoutCallback,
  };
}
