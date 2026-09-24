"use client";

import { Suspense } from "react";
import { Route } from "@/routes/library";

export default function LibraryPage() {
  const Component = (Route as any).component;
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  );
}
