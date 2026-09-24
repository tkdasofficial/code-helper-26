"use client";

import { Suspense } from "react";
import { Route } from "@/routes/oauth/google/return";

export default function OAuthGoogleReturnPage() {
  const Component = (Route as any).component;
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  );
}
