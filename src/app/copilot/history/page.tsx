"use client";

import { Suspense } from "react";
import { Route } from "@/routes/_authenticated/copilot.history";

export default function CopilotHistoryPage() {
  const Component = (Route as any).component;
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  );
}
