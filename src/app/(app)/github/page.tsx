import { TokenSettingsForm } from "@/components/token-settings-form";
import { getStoredGitHubToken } from "@/lib/auth";
import { fetchGitHubUser } from "@/lib/github-api";

export default async function GitHubSettingsPage() {
  const token = await getStoredGitHubToken();
  const user = token
    ? await fetchGitHubUser({ token }).catch(() => null)
    : null;

  return (
    <TokenSettingsForm
      title="GitHub Settings"
      description="Manage your GitHub Personal Access Token"
      placeholder="ghp_..."
      docsHref="https://github.com/settings/tokens"
      docsLabel="github.com/settings/tokens"
      connectedLabel={
        user ? `${user.name ?? user.login} (@${user.login})` : "Authenticated"
      }
      tokenPresent={Boolean(token)}
      onSave={async (nextToken) => {
        "use server";
        const { saveGitHubTokenAction } = await import("@/app/actions");
        const formData = new FormData();
        formData.set("token", nextToken);
        return saveGitHubTokenAction(formData);
      }}
      onClear={async () => {
        "use server";
        const { clearGitHubTokenAction } = await import("@/app/actions");
        await clearGitHubTokenAction();
      }}
    />
  );
}
