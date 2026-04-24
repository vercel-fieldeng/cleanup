const VERCEL_API = "https://api.vercel.com";

type FetchOptions = {
  token: string;
  teamId?: string;
};

async function vercelFetch<T = unknown>(
  path: string,
  { token, teamId }: FetchOptions,
  init?: RequestInit,
): Promise<T> {
  const url = new URL(path, VERCEL_API);
  if (teamId) url.searchParams.set("teamId", teamId);

  const res = await fetch(url.toString(), {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Vercel API ${res.status}: ${text}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function fetchAllProjects(opts: FetchOptions) {
  const all: Array<Record<string, unknown>> = [];
  let until: number | undefined;

  for (;;) {
    const url = until
      ? `/v9/projects?limit=100&until=${until}`
      : "/v9/projects?limit=100";

    const data = await vercelFetch<{
      projects: Array<Record<string, unknown>>;
      pagination?: { next?: number };
    }>(url, opts);

    all.push(...data.projects);
    if (!data.pagination?.next) break;
    until = data.pagination.next;
  }

  return all;
}

export async function fetchProject(id: string, opts: FetchOptions) {
  return vercelFetch<Record<string, unknown>>(`/v13/projects/${id}`, opts);
}

export async function fetchDeployments(projectId: string, opts: FetchOptions, limit = 15) {
  return vercelFetch<{ deployments: Array<Record<string, unknown>> }>(
    `/v6/deployments?projectId=${projectId}&limit=${limit}`,
    opts,
  );
}

export async function fetchEnvVars(projectId: string, opts: FetchOptions) {
  return vercelFetch<{ envs: Array<Record<string, unknown>> }>(
    `/v9/projects/${projectId}/env?decrypt=true`,
    opts,
  );
}

export async function fetchEnvVarDecrypted(projectId: string, envId: string, opts: FetchOptions) {
  return vercelFetch<Record<string, unknown>>(
    `/v1/projects/${projectId}/env/${envId}`,
    opts,
  );
}

export async function deleteProject(id: string, opts: FetchOptions) {
  await vercelFetch(`/v9/projects/${id}`, opts, { method: "DELETE" });
}

export async function fetchIntegrations(opts: FetchOptions) {
  return vercelFetch<Array<Record<string, unknown>>>(
    "/v1/integrations/configurations?view=account",
    opts,
  );
}

export async function fetchStores(opts: FetchOptions) {
  return vercelFetch<{ stores: Array<Record<string, unknown>> }>(
    "/v1/storage/stores?integrationProductProtocol=storage",
    opts,
  );
}

export async function deleteIntegrationConfig(configId: string, opts: FetchOptions) {
  await vercelFetch(`/v1/integrations/configuration/${configId}`, opts, { method: "DELETE" });
}

export async function deleteStore(storeId: string, opts: FetchOptions) {
  const path = storeId.startsWith("ecfg_")
    ? `/v1/edge-config/${storeId}`
    : `/v1/storage/stores/${storeId}/connections`;
  await vercelFetch(path, opts, { method: "DELETE" });
}

export async function deleteEnvVar(projectId: string, envId: string, opts: FetchOptions) {
  await vercelFetch(`/v9/projects/${projectId}/env/${envId}`, opts, { method: "DELETE" });
}

export async function revokeOpenAIKey(rawValue: string) {
  // extract the sk- key from the value (may be embedded in a longer string)
  const match = rawValue.match(/sk-[A-Za-z0-9_-]{20,}/);
  if (!match) {
    throw new Error("No valid OpenAI API key (sk-...) found in env var value");
  }

  const res = await fetch("https://api.openai.com/external/compromised_secret", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: { api_key: match[0] },
      comment: "Revoked via Vercel Cleanup tool",
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI revoke failed: ${res.status}`);
  }
}

