"use client";

import { Suspense } from "react";
import { Route } from "@/routes/audio";

export default function AudioPage() {
  const Component = (Route as any).component;
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  );
}
