"use client";

import { Suspense } from "react";
import { Route } from "@/routes/pricing";

export default function PricingPage() {
  const Component = (Route as any).component;
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  );
}
