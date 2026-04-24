import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";

import { TokenProvider } from "@/components/token-provider";
import {
  getStoredGitHubOrg,
  getStoredGitHubToken,
  getStoredVercelTeam,
  getStoredVercelToken,
} from "@/lib/auth";
import { fetchGitHubOrgs, fetchGitHubUser } from "@/lib/github-api";
import { fetchTeams, fetchVercelUser } from "@/lib/vercel-api";

import "./tailwind.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bulk Projects — Vercel",
  description: "Bulk manage and clean up Vercel projects",
  icons: [{ rel: "icon", url: "/favicon.svg", type: "image/svg+xml" }],
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [token, storedTeam, githubToken, storedGitHubOrg] = await Promise.all([
    getStoredVercelToken(),
    getStoredVercelTeam(),
    getStoredGitHubToken(),
    getStoredGitHubOrg(),
  ]);

  const [user, teams, githubUser, githubOrgs] = await Promise.all([
    token
      ? fetchVercelUser({ token }).catch(() => null)
      : Promise.resolve(null),
    token ? fetchTeams({ token }).catch(() => []) : Promise.resolve([]),
    githubToken
      ? fetchGitHubUser({ token: githubToken }).catch(() => null)
      : Promise.resolve(null),
    githubToken
      ? fetchGitHubOrgs({ token: githubToken }).catch(() => [])
      : Promise.resolve([]),
  ]);

  const team =
    storedTeam && teams.some((item) => item.id === storedTeam.id)
      ? storedTeam
      : (teams[0] ?? null);
  const githubOrg =
    storedGitHubOrg && githubOrgs.some((item) => item.id === storedGitHubOrg.id)
      ? storedGitHubOrg
      : (githubOrgs[0] ?? null);

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        <TokenProvider
          value={{
            token,
            user,
            team,
            teams,
            githubToken,
            githubUser,
            githubOrg,
            githubOrgs,
          }}
        >
          {children}
        </TokenProvider>
      </body>
    </html>
  );
}
