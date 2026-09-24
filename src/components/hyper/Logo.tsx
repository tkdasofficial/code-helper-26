"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import lightIcon from "@/assets/light_app_icon.svg";
import darkIcon from "@/assets/dark_app_icon.svg";
import { useTheme } from "./ThemeProvider";

const lightSrc = typeof lightIcon === "string" ? lightIcon : (lightIcon as any)?.src || "/light_app_icon.svg";
const darkSrc = typeof darkIcon === "string" ? darkIcon : (darkIcon as any)?.src || "/dark_app_icon.svg";

/** Icon swaps with the theme; wordmark uses currentColor. */
export function Logo({ className }: { className?: string }) {
  const { resolved } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <span className={cn("flex items-center gap-2.5 text-foreground", className)}>
      <span className="relative block h-7 w-7 shrink-0 overflow-hidden rounded-lg">
        {!mounted ? (
          <>
            <img
              src={lightSrc}
              alt="Hyper Copilot logo"
              className="h-full w-full object-contain dark:hidden"
            />
            <img
              src={darkSrc}
              alt="Hyper Copilot logo"
              className="hidden h-full w-full object-contain dark:block [html.dark_&]:block"
            />
          </>
        ) : (
          <img
            src={resolved === "dark" ? darkSrc : lightSrc}
            alt="Hyper Copilot logo"
            className="h-full w-full object-contain"
          />
        )}
      </span>
      <span className="text-[15px] font-extrabold tracking-tight">Hyper Copilot</span>
    </span>
  );
}
