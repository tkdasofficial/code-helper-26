/* eslint-disable */
"use client";

import React, { createContext, useContext } from "react";
import NextLink, { type LinkProps as NextLinkProps } from "next/link";
import { useRouter as useNextRouter, usePathname, useSearchParams, useParams as useNextParams } from "next/navigation";

export interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  to?: string;
  href?: string;
  params?: Record<string, string | number>;
  search?: Record<string, any>;
  activeProps?: { className?: string; style?: React.CSSProperties };
  inactiveProps?: { className?: string; style?: React.CSSProperties };
  children?: React.ReactNode;
}

function resolveHref(to?: string, href?: string, params?: Record<string, string | number>): string {
  let target = to || href || "/";
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      target = target.replace(`$${k}`, encodeURIComponent(String(v)));
      target = target.replace(`:${k}`, encodeURIComponent(String(v)));
    }
  }
  return target;
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, href, params, search, activeProps, inactiveProps, className, children, ...rest },
  ref,
) {
  const pathname = usePathname();
  let resolved = resolveHref(to, href, params);

  if (search && Object.keys(search).length > 0) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(search)) {
      if (v !== undefined && v !== null) {
        sp.set(k, String(v));
      }
    }
    const qs = sp.toString();
    if (qs) {
      resolved += (resolved.includes("?") ? "&" : "?") + qs;
    }
  }

  const isActive = pathname === resolved || (resolved !== "/" && pathname.startsWith(resolved));
  const activeClass = isActive ? activeProps?.className : inactiveProps?.className;
  const combinedClass = [className, activeClass].filter(Boolean).join(" ");

  return (
    <NextLink ref={ref} href={resolved} className={combinedClass || undefined} {...rest}>
      {children}
    </NextLink>
  );
});

export function useNavigate() {
  const router = useNextRouter();

  return React.useCallback(
    (opts: { to?: string; href?: string; params?: Record<string, string | number>; replace?: boolean } | string) => {
      if (typeof opts === "string") {
        router.push(opts);
        return;
      }
      const target = resolveHref(opts.to, opts.href, opts.params);
      if (opts.replace) {
        router.replace(target);
      } else {
        router.push(target);
      }
    },
    [router],
  );
}

export function useRouter() {
  const router = useNextRouter();
  const pathname = usePathname();

  return React.useMemo(
    () => ({
      push: router.push,
      replace: router.replace,
      back: router.back,
      refresh: router.refresh,
      prefetch: (url: string) => router.prefetch(url),
      preloadRoute: ({ to, href }: { to?: string; href?: string } = {}) => {
        const target = to || href;
        if (target) router.prefetch(target);
        return Promise.resolve();
      },
      invalidate: () => {
        router.refresh();
        return Promise.resolve();
      },
      state: {
        location: { pathname },
        resolvedLocation: { pathname },
      },
    }),
    [router, pathname],
  );
}

export function useRouterState<T = any>({ select }: { select?: (state: any) => T } = {}): T {
  const pathname = usePathname();
  const state = {
    location: { pathname },
    resolvedLocation: { pathname },
    status: "idle",
    isLoading: false,
  };
  return select ? select(state) : (state as unknown as T);
}

export function useParams(): Record<string, string> {
  const params = useNextParams();
  return (params as Record<string, string>) || {};
}

export function useSearch<T = Record<string, string>>(): T {
  const searchParams = useSearchParams();
  const result: Record<string, string> = {};
  if (searchParams) {
    searchParams.forEach((value, key) => {
      result[key] = value;
    });
  }
  return result as unknown as T;
}

export function createFileRoute(path: string) {
  return (config: any) => ({
    path,
    ...config,
    component: config.component,
    useParams: () => {
      const params = useNextParams();
      return (params as Record<string, string>) || {};
    },
    useSearch: () => {
      const searchParams = useSearchParams();
      const result: Record<string, string> = {};
      if (searchParams) {
        searchParams.forEach((value, key) => {
          result[key] = value;
        });
      }
      return result;
    },
    useRouteContext: () => ({ queryClient: undefined }),
  });
}

export function createRootRouteWithContext<T = any>() {
  return () => (config: any) => ({
    ...config,
    useRouteContext: () => ({ queryClient: undefined }),
  });
}

export function Outlet({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export function redirect(opts: { to: string }) {
  if (typeof window !== "undefined") {
    window.location.href = opts.to;
  }
  return opts;
}

export function HeadContent() {
  return null;
}

export function Scripts() {
  return null;
}
