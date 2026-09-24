"use client";

import { Suspense } from "react";
import { Route } from "@/routes/oauth/meta/return";

export default function OAuthMetaReturnPage() {
  const Component = (Route as any).component;
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  );
}
