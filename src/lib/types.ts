export type VercelTeam = {
  id: string;
  name: string;
  slug: string;
  avatar?: string;
};

export type VercelProject = {
  id: string;
  name: string;
  framework: string | null;
  createdAt: number;
  updatedAt: number;
  link?: {
    type: string;
    repo: string;
    org: string;
    repoId: number;
  };
  latestDeployments?: Array<{
    id: string;
    createdAt: number;
    state: string;
    creator: { username: string };
    meta?: { githubCommitMessage?: string };
  }>;
  targets?: Record<string, unknown>;
};

export type VercelDeployment = {
  uid: string;
  name: string;
  url: string;
  created: number;
  state: string;
  creator: { username: string; email: string };
  meta?: {
    githubCommitMessage?: string;
    githubCommitRef?: string;
    githubCommitSha?: string;
    githubCommitAuthorLogin?: string;
  };
  target: string | null;
  inspectorUrl: string;
};

export type VercelEnvVar = {
  id: string;
  key: string;
  value: string;
  target: string[];
  type: "plain" | "secret" | "encrypted" | "sensitive" | "system";
  configurationId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type VercelIntegration = {
  id: string;
  slug: string;
  integrationId: string;
  ownerId: string;
  projects?: string[];
  projectSelection: "all" | "selected";
  source: string;
  createdAt: number;
  externalId?: string;
  status?: string;
  installationType?: string;
  integration?: {
    name: string;
    icon: string;
    isLegacy: boolean;
    tagIds?: string[];
  };
};

export type VercelStoreProjectMeta = {
  id: string;
  projectId: string;
  name: string;
  framework: string | null;
  latestDeployment: string | null;
  environments: string[];
  envVarPrefix: string;
  environmentVariables: string[];
};

export type VercelStoreProduct = {
  slug: string;
  name: string;
  iconUrl?: string;
  integrationConfigurationId?: string;
  integration?: {
    slug: string;
    name: string;
    icon?: string;
  };
};

export type VercelStore = {
  id: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
  type: string;
  name: string;
  billingState: string;
  projectsMetadata: VercelStoreProjectMeta[];
  totalConnectedProjects: number;
  status: string | null;
  product?: VercelStoreProduct;
};

export type ProjectWithMeta = VercelProject & {
  envVarCount: number | null;
  integrationCount: number | null;
};
