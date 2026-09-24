"use client";

import { Suspense } from "react";
import { Route } from "@/routes/virtual-model.index";

export default function VirtualModelPage() {
  const Component = (Route as any).component;
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  );
}
