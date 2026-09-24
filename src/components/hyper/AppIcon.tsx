"use client";

import { useEffect, useState } from "react";
import lightIcon from "@/assets/light_app_icon.svg";
import darkIcon from "@/assets/dark_app_icon.svg";
import { cn } from "@/lib/utils";
import { useTheme } from "./ThemeProvider";

const lightSrc = typeof lightIcon === "string" ? lightIcon : (lightIcon as any)?.src || "/light_app_icon.svg";
const darkSrc = typeof darkIcon === "string" ? darkIcon : (darkIcon as any)?.src || "/dark_app_icon.svg";

export function AppIcon({ className, alt = "Hyper Copilot" }: { className?: string; alt?: string }) {
  const { resolved } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <span className={cn("relative block shrink-0 overflow-hidden", className)}>
      {!mounted ? (
        <>
          <img
            src={lightSrc}
            alt={alt}
            className="h-full w-full object-contain dark:hidden"
          />
          <img
            src={darkSrc}
            alt={alt}
            className="hidden h-full w-full object-contain dark:block [html.dark_&]:block"
          />
        </>
      ) : (
        <img
          src={resolved === "dark" ? darkSrc : lightSrc}
          alt={alt}
          className="h-full w-full object-contain"
        />
      )}
    </span>
  );
}
