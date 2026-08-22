import { createServerFn } from "@tanstack/react-start";

export type SyncState = "synced" | "pending" | "unknown";

export type SyncStatus = {
  repo: string;
  repoUrl: string;
  branch: string;
  commit: {
    sha: string;
    shortSha: string;
    message: string;
    author: string;
    committedAt: string;
    url: string;
  } | null;
  lastPublishAt: string | null;
  publishedUrl: string;
  state: SyncState;
  checkedAt: string;
  error?: string;
};

const REPO = "Watch-Zone/VideoStream-UI";
const PUBLISHED_URL = "https://streamheart-ui.lovable.app";

export const getGithubSyncStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<SyncStatus> => {
    const base: SyncStatus = {
      repo: REPO,
      repoUrl: `https://github.com/${REPO}`,
      branch: "main",
      commit: null,
      lastPublishAt: null,
      publishedUrl: PUBLISHED_URL,
      state: "unknown",
      checkedAt: new Date().toISOString(),
    };

    const [commitResult, publishResult] = await Promise.allSettled([
      fetch(`https://api.github.com/repos/${REPO}/commits?per_page=1`, {
        headers: { Accept: "application/vnd.github+json", "User-Agent": "streamhub-sync-panel" },
      }),
      fetch(PUBLISHED_URL, { method: "HEAD" }),
    ]);

    if (commitResult.status === "fulfilled" && commitResult.value.ok) {
      const rows = (await commitResult.value.json()) as Array<{
        sha: string;
        html_url: string;
        commit: { message: string; author: { name?: string; date?: string } };
      }>;
      const first = rows[0];
      if (first) {
        base.commit = {
          sha: first.sha,
          shortSha: first.sha.slice(0, 7),
          message: (first.commit.message ?? "").split("\n")[0] ?? "",
          author: first.commit.author?.name ?? "unknown",
          committedAt: first.commit.author?.date ?? "",
          url: first.html_url,
        };
      }
    } else if (commitResult.status === "fulfilled") {
      base.error = `GitHub API returned ${commitResult.value.status}`;
    } else {
      base.error = "Could not reach the GitHub API";
    }

    if (publishResult.status === "fulfilled" && publishResult.value.ok) {
      const headers = publishResult.value.headers;
      const stamp = headers.get("last-modified") ?? headers.get("date");
      if (stamp) {
        const parsed = new Date(stamp);
        if (!Number.isNaN(parsed.getTime())) base.lastPublishAt = parsed.toISOString();
      }
    }

    if (base.commit && base.lastPublishAt) {
      const committed = new Date(base.commit.committedAt).getTime();
      const published = new Date(base.lastPublishAt).getTime();
      base.state = Number.isNaN(committed) || committed <= published ? "synced" : "pending";
    }

    return base;
  },
);
