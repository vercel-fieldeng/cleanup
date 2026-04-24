import type { GitHubUserInfo } from "@/lib/auth";
import type { GitHubOrg } from "@/lib/github-types";

const GITHUB_API = "https://api.github.com";

type FetchOptions = {
  token: string;
};

async function githubFetch<T = unknown>(
  path: string,
  { token }: FetchOptions,
  init?: RequestInit,
): Promise<T> {
  const url = path.startsWith("http") ? path : `${GITHUB_API}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GitHub API ${res.status}: ${text}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function fetchGitHubUser(
  opts: FetchOptions,
): Promise<GitHubUserInfo | null> {
  const data = await githubFetch<{
    login: string;
    name: string | null;
    avatar_url: string;
  }>("/user", opts).catch(() => null);

  if (!data) {
    return null;
  }

  return {
    login: data.login,
    name: data.name ?? null,
    avatar_url: data.avatar_url,
  };
}

export async function fetchGitHubOrgs(
  opts: FetchOptions,
): Promise<GitHubOrg[]> {
  return githubFetch<Array<{ id: number; login: string; avatar_url: string }>>(
    "/user/orgs?per_page=100",
    opts,
  );
}

export async function fetchOrgRepos(org: string, opts: FetchOptions) {
  const all: Array<Record<string, unknown>> = [];
  let page = 1;
  for (;;) {
    const data = await githubFetch<Array<Record<string, unknown>>>(
      `/orgs/${encodeURIComponent(org)}/repos?per_page=100&page=${page}&sort=updated`,
      opts,
    );
    all.push(...data);
    if (data.length < 100) break;
    page++;
  }
  return all;
}

export async function fetchUserRepos(opts: FetchOptions) {
  const all: Array<Record<string, unknown>> = [];
  let page = 1;
  for (;;) {
    const data = await githubFetch<Array<Record<string, unknown>>>(
      `/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner`,
      opts,
    );
    all.push(...data);
    if (data.length < 100) break;
    page++;
  }
  return all;
}

export async function fetchRepo(
  owner: string,
  repo: string,
  opts: FetchOptions,
) {
  return githubFetch<Record<string, unknown>>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    opts,
  );
}

export async function fetchRepoCommits(
  owner: string,
  repo: string,
  opts: FetchOptions,
  limit = 10,
) {
  return githubFetch<Array<Record<string, unknown>>>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=${limit}`,
    opts,
  );
}

export async function fetchRepoContributors(
  owner: string,
  repo: string,
  opts: FetchOptions,
) {
  return githubFetch<Array<Record<string, unknown>>>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contributors?per_page=50`,
    opts,
  );
}

export async function fetchRepoReadme(
  owner: string,
  repo: string,
  opts: FetchOptions,
) {
  try {
    const data = await githubFetch<{ content: string; encoding: string }>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`,
      opts,
    );
    if (data.encoding === "base64") {
      return atob(data.content);
    }
    return data.content;
  } catch {
    return null;
  }
}

export async function archiveRepo(
  owner: string,
  repo: string,
  opts: FetchOptions,
) {
  return githubFetch(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    opts,
    {
      method: "PATCH",
      body: JSON.stringify({ archived: true }),
    },
  );
}

export async function deleteRepo(
  owner: string,
  repo: string,
  opts: FetchOptions,
) {
  return githubFetch(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    opts,
    {
      method: "DELETE",
    },
  );
}
