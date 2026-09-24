"use client";

import { Suspense } from "react";
import { Route } from "@/routes/_authenticated/getting-ready";

export default function GettingReadyPage() {
  const Component = (Route as any).component;
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  );
}
