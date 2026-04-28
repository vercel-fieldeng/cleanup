"use client";

import Image from "next/image";
import Link from "next/link";
import { type SyntheticEvent, useEffect, useRef, useState } from "react";

import {
  Check as CheckIcon,
  ChevronRight as ChevronIcon,
  Settings as SettingsIcon,
} from "lucide-react";
import { useToken } from "@/components/token-provider";

function teamAvatarUrl(teamId: string, size = 64) {
  return `https://vercel.com/api/www/avatar?teamId=${encodeURIComponent(teamId)}&s=${size}`;
}

function userAvatarUrl(uid: string, size = 64) {
  return `https://vercel.com/api/www/avatar?uid=${encodeURIComponent(uid)}&s=${size}`;
}

export function TeamAvatar({
  src,
  name,
  size,
}: {
  src: string;
  name: string;
  size: number;
}) {
  const [failed, setFailed] = useState(false);
  const initial = name.charAt(0).toUpperCase();

  if (failed) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-surface-hover font-mono text-text-tertiary"
        style={{ width: size, height: size, fontSize: size * 0.45 }}
      >
        {initial}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      unoptimized
      className="shrink-0 rounded-full"
      onError={(e: SyntheticEvent<HTMLImageElement>) => {
        e.currentTarget.onerror = null;
        setFailed(true);
      }}
    />
  );
}

export function TeamSwitcher() {
  const { user, team, setTeam, teams } = useToken();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const isPersonal = teams.length === 0;
  const currentLabel = isPersonal
    ? (user?.name ?? user?.username ?? "Personal")
    : (team?.name ?? teams[0]?.name ?? "—");
  const currentAvatar = isPersonal
    ? user?.id
      ? userAvatarUrl(user.id)
      : null
    : team
      ? teamAvatarUrl(team.id)
      : null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 items-center gap-2 border border-border bg-surface px-3 text-sm transition-colors hover:bg-surface-hover"
      >
        {currentAvatar && (
          <TeamAvatar src={currentAvatar} name={currentLabel} size={20} />
        )}
        <span className="max-w-[180px] truncate">{currentLabel}</span>
        <ChevronIcon
          size={12}
          className={`text-text-tertiary transition-transform ${open ? "rotate-90" : "-rotate-90"}`}
        />
      </button>

      {open && teams.length > 0 && (
        <div className="absolute top-full right-0 z-50 mt-1 min-w-[220px] border border-border bg-surface shadow-lg">
          <div className="py-1">
            {teams.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTeam(t);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-surface-hover ${
                  team?.id === t.id ? "text-text" : "text-text-secondary"
                }`}
              >
                <TeamAvatar src={teamAvatarUrl(t.id)} name={t.name} size={20} />
                <span className="truncate">{t.name}</span>
                {team?.id === t.id && (
                  <CheckIcon size={14} className="ml-auto shrink-0" />
                )}
              </button>
            ))}
          </div>
          <div className="border-border border-t">
            <Link
              href="/vercel"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover"
            >
              <SettingsIcon size={14} />
              Manage
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
