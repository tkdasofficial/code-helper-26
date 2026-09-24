"use client";

import { Suspense } from "react";
import { Route } from "@/routes/_authenticated/copilot.index";

export default function CopilotPage() {
  const Component = (Route as any).component;
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  );
}
