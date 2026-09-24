"use client";

import { Suspense } from "react";
import { Route } from "@/routes/_authenticated/workflows.create";

export default function CreateWorkflowPage() {
  const Component = (Route as any).component;
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  );
}
