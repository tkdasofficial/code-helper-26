/* eslint-disable */
import { supabase } from "@/config";

export function createMiddleware(options?: { type?: string }) {
  return {
    server: (fn: any) => fn,
    client: (fn: any) => fn,
  };
}

export function createStart(factory: () => any) {
  return factory();
}

export function createCsrfMiddleware(options?: any) {
  return options;
}

export function createServerFn(options?: { method?: string; name?: string }) {
  let validator: ((input: any) => any) | null = null;
  let handler: ((ctx: { data: any; context: any }) => Promise<any>) | null = null;
  const middlewares: any[] = [];

  const builder = {
    middleware(m: any[]) {
      middlewares.push(...m);
      return builder;
    },
    inputValidator(v: (input: any) => any) {
      validator = v;
      return builder;
    },
    handler(h: (ctx: { data: any; context: any }) => Promise<any>) {
      handler = h;

      const fn: any = async (args?: { data?: any }) => {
        const inputData = args && "data" in args ? args.data : args;
        const targetName = fn.__name || options?.name;

        // If in browser, dispatch to Next.js API route
        if (typeof window !== "undefined") {
          try {
            if (!targetName) {
              console.error("[ServerFn Error]: Missing function name for server call", options);
              throw new Error("Missing function name for server RPC call");
            }

            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token;

            const res = await fetch("/api/server-fn", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                fnName: targetName,
                data: inputData,
              }),
            });

            const json = await res.json();
            if (!res.ok) {
              throw new Error(json.error || `Server function call failed (${res.status})`);
            }
            return json.data;
          } catch (err: any) {
            console.error(`[ServerFn ${targetName} error]:`, err);
            throw err;
          }
        }

        // Server execution
        if (handler) {
          const validated = validator ? validator(inputData) : inputData;
          return await handler({ data: validated, context: (args as any)?.context || {} });
        }
        return null;
      };

      fn.__handler = handler;
      fn.__validator = validator;
      fn.__middlewares = middlewares;
      fn.__options = options;
      if (options?.name) {
        fn.__name = options.name;
      }

      return fn;
    },
  };

  return builder;
}

export function useServerFn<T extends (...args: any[]) => any>(fn: T): T {
  return fn;
}
