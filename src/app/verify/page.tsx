"use client";

import { Suspense } from "react";
import { Route } from "@/routes/verify";

export default function VerifyPage() {
  const Component = (Route as any).component;
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  );
}
