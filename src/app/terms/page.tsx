"use client";

import { Suspense } from "react";
import { Route } from "@/routes/terms";

export default function TermsPage() {
  const Component = (Route as any).component;
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  );
}
