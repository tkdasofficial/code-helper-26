import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyProfile = createServerFn({ method: "GET", name: "getMyProfile" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, email, full_name, role, purpose, onboarding_completed")
      .eq("id", context.userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  });
(getMyProfile as any).__name = "getMyProfile";

export const completeOnboarding = createServerFn({ method: "POST", name: "completeOnboarding" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        full_name: z.string().min(2).max(80),
        role: z.string().min(1).max(60),
        purpose: z.string().min(1).max(200),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ ...data, onboarding_completed: true })
      .eq("id", context.userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });
(completeOnboarding as any).__name = "completeOnboarding";
