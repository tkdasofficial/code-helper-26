"use client";

import { Suspense } from "react";
import { Route } from "@/routes/video-agent";

export default function VideoAgentPage() {
  const Component = (Route as any).component;
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  );
}
