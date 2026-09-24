/* eslint-disable */
import { NextResponse } from "next/server";
import { serverFunctionRegistry } from "@/lib/server-fn-registry";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/config";
import type { Database } from "@/integrations/supabase/types";
import { requestStorage } from "@/lib/compat/react-start-server";

export async function POST(req: Request) {
  const runner = (action: () => Promise<Response>) =>
    requestStorage && typeof requestStorage.run === "function" ? requestStorage.run(req, action) : action();

  return runner(async () => {
    try {
      const body = await req.json();
      const { fnName, data } = body;

      if (!fnName) {
        return NextResponse.json({ error: "Missing function name (fnName)" }, { status: 400 });
      }

      const fn = serverFunctionRegistry[fnName];
      if (!fn) {
        return NextResponse.json({ error: `Server function "${fnName}" not found` }, { status: 404 });
      }

      const authHeader = req.headers.get("authorization") || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null;

      let userId = "";
      let claims: any = null;
      let scopedSupabase = null;

      if (token) {
        scopedSupabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
              apikey: SUPABASE_PUBLISHABLE_KEY,
            },
          },
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        });

        try {
          const { data: userData } = await scopedSupabase.auth.getUser(token);
          if (userData?.user?.id) {
            userId = userData.user.id;
          }
        } catch {
          // ignore error
        }

        if (!userId) {
          try {
            const { data: claimsData } = await scopedSupabase.auth.getClaims(token);
            if (claimsData?.claims?.sub) {
              userId = claimsData.claims.sub as string;
              claims = claimsData.claims;
            }
          } catch {
            // ignore error
          }
        }

        if (!userId && token.split(".").length === 3) {
          try {
            const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
            if (payload?.sub) {
              userId = payload.sub;
              claims = payload;
            }
          } catch {
            // ignore error
          }
        }
      }

      const context = {
        supabase: scopedSupabase,
        userId,
        claims,
      };

      const validatedData = fn.__validator ? fn.__validator(data) : data;
      const result = await fn.__handler({ data: validatedData, context });

      return NextResponse.json({ data: result });
    } catch (error: any) {
      console.error("[api/server-fn error]:", error);
      return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
  });
}
