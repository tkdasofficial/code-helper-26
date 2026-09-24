"use client";

import { Suspense } from "react";
import { Route } from "@/routes/_authenticated/copilot.$chatId";

export default function CopilotChatPage() {
  const Component = (Route as any).component;
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  );
}
