"use client";

import { useState } from "react";

import { ExternalLink as ExternalLinkIcon } from "lucide-react";
import { useToken } from "@/components/token-provider";

export function TokenInput() {
  const { setToken } = useToken();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = value.trim();
    if (!trimmed) return;

    try {
      const headers = { Authorization: `Bearer ${trimmed}` };
      const userRes = await fetch("https://api.vercel.com/v2/user", {
        headers,
      });
      if (!userRes.ok) {
        const teamsRes = await fetch("https://api.vercel.com/v2/teams", {
          headers,
        });
        if (!teamsRes.ok) throw new Error("Invalid token");
      }
      setToken(trimmed);
    } catch {
      setError("Invalid token — check your PAT and try again");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="flex flex-col items-center gap-3">
        <svg width={24} height={24} viewBox="0 0 76 65" fill="currentColor" aria-hidden="true"><path d="M37.5274 0L75.0548 65H0L37.5274 0Z" /></svg>
        <h1 className="font-semibold text-lg">Cleanup</h1>
        <p className="text-sm text-text-secondary">
          Enter your Vercel Personal Access Token to get started
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-md flex-col gap-3"
      >
        <input
          type="password"
          placeholder="vercel_pat_..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-10 w-full border border-border bg-surface px-3 font-mono text-sm text-text outline-none transition-colors placeholder:text-text-tertiary focus:border-text-secondary"
        />
        {error && <p className="text-danger text-xs">{error}</p>}
        <button
          type="submit"
          className="h-10 bg-white font-medium text-black text-sm transition-opacity hover:opacity-90"
        >
          Connect
        </button>
      </form>

      <p className="max-w-sm text-center text-text-tertiary text-xs">
        Create a token at{" "}
        <a
          href="https://vercel.com/account/tokens"
          target="_blank"
          rel="noreferrer"
          className="text-text-secondary underline"
        >
          vercel.com/account/tokens
          <ExternalLinkIcon className="inline-block align-[-1px]" size={10} />
        </a>{" "}
        with full access scope.
      </p>
    </div>
  );
}
