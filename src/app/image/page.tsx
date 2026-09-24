"use client";

import { Suspense } from "react";
import { Route } from "@/routes/image";

export default function ImagePage() {
  const Component = (Route as any).component;
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  );
}
