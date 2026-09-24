"use client";

import { Suspense } from "react";
import { Route } from "@/routes/settings";

export default function SettingsPage() {
  const Component = (Route as any).component;
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  );
}
