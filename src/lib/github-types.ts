export type GitHubOrg = {
  id: number;
  login: string;
  avatar_url: string;
};

export type GitHubRepo = {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string; avatar_url: string };
  description: string | null;
  archived: boolean;
  private: boolean;
  pushed_at: string | null;
  updated_at: string | null;
  created_at: string;
  language: string | null;
  stargazers_count: number;
  default_branch: string;
  html_url: string;
};

export type GitHubCommit = {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  author: {
    login: string;
    avatar_url: string;
  } | null;
  html_url: string;
};

export type GitHubContributor = {
  login: string;
  avatar_url: string;
  contributions: number;
  html_url: string;
};
