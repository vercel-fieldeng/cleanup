import { cookies } from "next/headers";

import type { GitHubOrg } from "@/lib/github-types";

export type Team = {
  id: string;
  name: string;
  slug: string;
};

export type VercelUserInfo = {
  id: string;
  username: string;
  name: string | null;
};

export type GitHubUserInfo = {
  login: string;
  name: string | null;
  avatar_url: string;
};

const VERCEL_TOKEN_COOKIE = "vercel-pat";
const VERCEL_TEAM_COOKIE = "vercel-team";
const GITHUB_TOKEN_COOKIE = "github-pat";
const GITHUB_ORG_COOKIE = "github-org";

function parseJsonCookie<T>(value: string | undefined): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function getStoredVercelToken() {
  return (await cookies()).get(VERCEL_TOKEN_COOKIE)?.value ?? null;
}

export async function getStoredGitHubToken() {
  return (await cookies()).get(GITHUB_TOKEN_COOKIE)?.value ?? null;
}

export async function getStoredVercelTeam() {
  return parseJsonCookie<Team>(
    (await cookies()).get(VERCEL_TEAM_COOKIE)?.value,
  );
}

export async function getStoredGitHubOrg() {
  return parseJsonCookie<GitHubOrg>(
    (await cookies()).get(GITHUB_ORG_COOKIE)?.value,
  );
}

export async function persistVercelToken(token: string) {
  (await cookies()).set(VERCEL_TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
  });
}

export async function clearVercelToken() {
  const store = await cookies();
  store.delete(VERCEL_TOKEN_COOKIE);
  store.delete(VERCEL_TEAM_COOKIE);
}

export async function persistVercelTeam(team: Team | null) {
  const store = await cookies();

  if (!team) {
    store.delete(VERCEL_TEAM_COOKIE);
    return;
  }

  store.set(VERCEL_TEAM_COOKIE, JSON.stringify(team), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
  });
}

export async function persistGitHubToken(token: string) {
  (await cookies()).set(GITHUB_TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
  });
}

export async function clearGitHubToken() {
  const store = await cookies();
  store.delete(GITHUB_TOKEN_COOKIE);
  store.delete(GITHUB_ORG_COOKIE);
}

export async function persistGitHubOrg(org: GitHubOrg | null) {
  const store = await cookies();

  if (!org) {
    store.delete(GITHUB_ORG_COOKIE);
    return;
  }

  store.set(GITHUB_ORG_COOKIE, JSON.stringify(org), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
  });
}
