"use client";

import { createContext, type ReactNode, useContext } from "react";

import {
  clearGitHubTokenAction,
  clearVercelTokenAction,
  saveGitHubTokenAction,
  saveVercelTokenAction,
  selectGitHubOrgAction,
  selectVercelTeamAction,
} from "@/app/actions";
import type { GitHubUserInfo, Team, VercelUserInfo } from "@/lib/auth";
import type { GitHubOrg } from "@/lib/github-types";

type TokenContextValue = {
  token: string | null;
  user: VercelUserInfo | null;
  team: Team | null;
  teams: Team[];
  githubToken: string | null;
  githubUser: GitHubUserInfo | null;
  githubOrg: GitHubOrg | null;
  githubOrgs: GitHubOrg[];
  setToken: (token: string) => Promise<{ ok: boolean; error?: string }>;
  clearToken: () => Promise<void>;
  setTeam: (team: Team | null) => Promise<void>;
  setGithubToken: (token: string) => Promise<{ ok: boolean; error?: string }>;
  clearGithubToken: () => Promise<void>;
  setGithubOrg: (org: GitHubOrg | null) => Promise<void>;
};

const TokenContext = createContext<TokenContextValue | null>(null);

export function TokenProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: Omit<
    TokenContextValue,
    | "setToken"
    | "clearToken"
    | "setTeam"
    | "setGithubToken"
    | "clearGithubToken"
    | "setGithubOrg"
  >;
}) {
  return (
    <TokenContext.Provider
      value={{
        ...value,
        setToken: async (token) => {
          const formData = new FormData();
          formData.set("token", token);
          return saveVercelTokenAction(formData);
        },
        clearToken: async () => {
          await clearVercelTokenAction();
        },
        setTeam: async (team) => {
          await selectVercelTeamAction(team);
        },
        setGithubToken: async (token) => {
          const formData = new FormData();
          formData.set("token", token);
          return saveGitHubTokenAction(formData);
        },
        clearGithubToken: async () => {
          await clearGitHubTokenAction();
        },
        setGithubOrg: async (org) => {
          await selectGitHubOrgAction(org);
        },
      }}
    >
      {children}
    </TokenContext.Provider>
  );
}

export function useToken() {
  const ctx = useContext(TokenContext);
  if (!ctx) throw new Error("useToken must be used within TokenProvider");
  return ctx;
}
