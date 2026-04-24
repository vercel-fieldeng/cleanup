import { TokenSettingsForm } from "@/components/token-settings-form";
import { getStoredVercelToken } from "@/lib/auth";
import { fetchVercelUser } from "@/lib/vercel-api";

export default async function VercelSettingsPage() {
  const token = await getStoredVercelToken();
  const user = token
    ? await fetchVercelUser({ token }).catch(() => null)
    : null;

  return (
    <TokenSettingsForm
      title="Vercel Settings"
      description="Manage your Vercel Personal Access Token"
      placeholder="vcp_..."
      docsHref="https://vercel.com/account/tokens"
      docsLabel="vercel.com/account/tokens"
      connectedLabel={
        user
          ? `${user.name ?? user.username} (@${user.username})`
          : "Authenticated"
      }
      tokenPresent={Boolean(token)}
      onSave={async (nextToken) => {
        "use server";
        const { saveVercelTokenAction } = await import("@/app/actions");
        const formData = new FormData();
        formData.set("token", nextToken);
        return saveVercelTokenAction(formData);
      }}
      onClear={async () => {
        "use server";
        const { clearVercelTokenAction } = await import("@/app/actions");
        await clearVercelTokenAction();
      }}
    />
  );
}
