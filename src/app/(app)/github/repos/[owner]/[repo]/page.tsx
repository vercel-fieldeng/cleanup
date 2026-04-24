import { RepoDetail } from "@/components/repo-detail";

export default async function RepoDetailPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;
  return <RepoDetail owner={owner} repo={repo} />;
}
