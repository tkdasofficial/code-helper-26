"use client";

import { Suspense } from "react";
import { Route } from "@/routes/auth";

export default function AuthPage() {
  const Component = (Route as any).component;
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  );
}
