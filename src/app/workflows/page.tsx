"use client";

import { Suspense } from "react";
import { Route } from "@/routes/_authenticated/workflows.index";

export default function WorkflowsPage() {
  const Component = (Route as any).component;
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  );
}
