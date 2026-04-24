"use client";

import type { ReactNode } from "react";

import { Sidebar } from "@/components/sidebar";
import { TokenInput } from "@/components/token-input";
import { useToken } from "@/components/token-provider";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { token } = useToken();

  if (!token) return <TokenInput />;

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
