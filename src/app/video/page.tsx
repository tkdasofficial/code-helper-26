"use client";

import { Suspense } from "react";
import { Route } from "@/routes/video";

export default function VideoPage() {
  const Component = (Route as any).component;
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  );
}
