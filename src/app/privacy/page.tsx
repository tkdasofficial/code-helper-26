"use client";

import { Suspense } from "react";
import { Route } from "@/routes/privacy";

export default function PrivacyPage() {
  const Component = (Route as any).component;
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  );
}
