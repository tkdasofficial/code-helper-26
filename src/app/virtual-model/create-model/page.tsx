"use client";

import { Suspense } from "react";
import { Route } from "@/routes/virtual-model.create-model";

export default function CreateModelPage() {
  const Component = (Route as any).component;
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  );
}
