"use server";

import { revalidatePath } from "next/cache";

import {
  clearGitHubToken,
  clearVercelToken,
  persistGitHubOrg,
  persistGitHubToken,
  persistVercelTeam,
  persistVercelToken,
  type Team,
} from "@/lib/auth";
import { fetchGitHubOrgs, fetchGitHubUser } from "@/lib/github-api";
import type { GitHubOrg } from "@/lib/github-types";
import { fetchTeams, fetchVercelUser } from "@/lib/vercel-api";

async function refreshAllAppRoutes() {
  revalidatePath("/", "layout");
}

export async function saveVercelTokenAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();

  if (!token) {
    return { ok: false as const, error: "Token is required" };
  }

  try {
    const [user, teams] = await Promise.all([
      fetchVercelUser({ token }).catch(() => null),
      fetchTeams({ token }).catch(() => []),
    ]);

    if (!user && teams.length === 0) {
      return {
        ok: false as const,
        error: "Invalid token — check your PAT and try again",
      };
    }

    await persistVercelToken(token);
    if (teams.length > 0) {
      await persistVercelTeam(teams[0]);
    }

    await refreshAllAppRoutes();
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error: "Invalid token — check your PAT and try again",
    };
  }
}

export async function clearVercelTokenAction() {
  await clearVercelToken();
  await refreshAllAppRoutes();
  return { ok: true as const };
}

export async function selectVercelTeamAction(team: Team | null) {
  await persistVercelTeam(team);
  await refreshAllAppRoutes();
  return { ok: true as const };
}

export async function saveGitHubTokenAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();

  if (!token) {
    return { ok: false as const, error: "Token is required" };
  }

  try {
    const [user, orgs] = await Promise.all([
      fetchGitHubUser({ token }),
      fetchGitHubOrgs({ token }).catch(() => []),
    ]);

    if (!user) {
      return {
        ok: false as const,
        error: "Invalid token — check your GitHub PAT and try again",
      };
    }

    await persistGitHubToken(token);
    if (orgs.length > 0) {
      await persistGitHubOrg(orgs[0]);
    }

    await refreshAllAppRoutes();
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error: "Invalid token — check your GitHub PAT and try again",
    };
  }
}

export async function clearGitHubTokenAction() {
  await clearGitHubToken();
  await refreshAllAppRoutes();
  return { ok: true as const };
}

export async function selectGitHubOrgAction(org: GitHubOrg | null) {
  await persistGitHubOrg(org);
  await refreshAllAppRoutes();
  return { ok: true as const };
}
