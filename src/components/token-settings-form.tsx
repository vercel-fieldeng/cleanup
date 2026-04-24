"use client";

import { useState, useTransition } from "react";

export function TokenSettingsForm({
  title,
  description,
  placeholder,
  docsHref,
  docsLabel,
  connectedLabel,
  tokenPresent,
  onSave,
  onClear,
}: {
  title: string;
  description: string;
  placeholder: string;
  docsHref: string;
  docsLabel: string;
  connectedLabel: string;
  tokenPresent: boolean;
  onSave: (token: string) => Promise<{ ok: boolean; error?: string }>;
  onClear: () => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const token = value.trim();
    if (!token) return;

    startTransition(async () => {
      const result = await onSave(token);
      if (!result.ok) {
        setError(result.error ?? "Failed to save token");
        return;
      }
      setValue("");
    });
  }

  function handleClear() {
    setError(null);
    startTransition(async () => {
      await onClear();
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-6 py-8">
        <h1 className="font-semibold text-xl">{title}</h1>
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-8">
        <div className="w-full max-w-sm">
        {tokenPresent ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between border border-border bg-surface p-4">
              <div className="flex flex-col gap-1">
                <span className="font-medium text-sm">Connected</span>
                <span className="font-mono text-text-secondary text-xs">
                  {connectedLabel}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-success" />
                <span className="text-text-secondary text-xs">Active</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClear}
              disabled={pending}
              className="h-10 w-full border border-danger text-danger text-sm transition-colors hover:bg-danger/10 disabled:opacity-50"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col gap-3">
            <p className="text-sm text-text-secondary">
              Enter your personal access token to connect.
            </p>
            <input
              type="password"
              placeholder={placeholder}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="h-10 w-full border border-border bg-surface px-3 font-mono text-sm outline-none transition-colors placeholder:text-text-tertiary focus:border-text-secondary"
            />
            {error && <p className="text-danger text-xs">{error}</p>}
            <button
              type="submit"
              disabled={pending || !value.trim()}
              className="h-10 bg-white font-medium text-black text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Connecting..." : "Connect"}
            </button>
            <p className="text-text-tertiary text-xs">
              Create a token at{" "}
              <a
                href={docsHref}
                target="_blank"
                rel="noreferrer"
                className="text-text-secondary underline"
              >
                {docsLabel}
              </a>
            </p>
          </form>
        )}
        </div>
      </div>
    </div>
  );
}
