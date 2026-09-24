"use client";

import { Suspense } from "react";
import { Route } from "@/routes/_authenticated/integrations";

export default function IntegrationsPage() {
  const Component = (Route as any).component;
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  );
}
