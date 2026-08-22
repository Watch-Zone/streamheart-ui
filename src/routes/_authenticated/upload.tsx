import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Film, ImageIcon, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { confirmUpload, createUploadUrls } from "@/lib/api/endpoints";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({
    meta: [
      { title: "Upload a video — StreamHub" },
      {
        name: "description",
        content: "Upload your video to StreamHub, add a title, tags and thumbnail, and publish it to your channel.",
      },
      { property: "og:title", content: "Upload a video — StreamHub" },
      { property: "og:description", content: "Upload, describe and publish a video to your StreamHub channel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UploadPage,
});

function extensionOf(file: File, fallback: string) {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts[parts.length - 1]!.toLowerCase() : fallback;
}

/** Presigned S3 PUT with progress; fetch has no upload progress events. */
function putWithProgress(url: string, file: File, onProgress: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (${request.status})`));
    request.onerror = () => reject(new Error("Upload failed — network error"));
    request.send(file);
  });
}

function UploadPage() {
  const navigate = useNavigate();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState("General");
  const [isPublic, setIsPublic] = useState(true);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!videoFile || !title.trim()) return;

    setBusy(true);
    setProgress(0);
    try {
      const ticket = await createUploadUrls({
        videoExt: extensionOf(videoFile, "mp4"),
        contentType: videoFile.type || "video/mp4",
        ...(thumbFile ? { thumbnailExt: extensionOf(thumbFile, "jpg") } : {}),
      });

      await putWithProgress(ticket.videoUploadUrl, videoFile, setProgress);

      if (thumbFile && ticket.thumbnailUploadUrl) {
        await putWithProgress(ticket.thumbnailUploadUrl, thumbFile, () => {});
      }

      await confirmUpload({
        title: title.trim(),
        description: description.trim(),
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 10),
        category,
        isPublic,
        fileKey: ticket.videoKey,
      });

      toast.success("Upload complete — processing has started");
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl pt-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Upload a video</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your file is uploaded straight to storage, then transcoded for streaming.
        </p>

        <form className="panel mt-8 space-y-6 rounded-3xl p-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="video-file" className="flex items-center gap-2">
              <Film className="h-4 w-4 text-brand" /> Video file
            </Label>
            <Input
              id="video-file"
              type="file"
              accept="video/*"
              required
              onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="thumb-file" className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-brand" /> Thumbnail (optional)
            </Label>
            <Input
              id="thumb-file"
              type="file"
              accept="image/*"
              onChange={(event) => setThumbFile(event.target.files?.[0] ?? null)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={140}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={2000}
              rows={4}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="action, trailer"
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                maxLength={40}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-surface/60 p-4">
            <div>
              <p className="text-sm font-semibold">Public</p>
              <p className="text-xs text-muted-foreground">Anyone can find and watch this video.</p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} aria-label="Public video" />
          </div>

          {busy && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">Uploading… {progress}%</p>
            </div>
          )}

          <Button type="submit" className="w-full rounded-full" disabled={busy || !videoFile || !title.trim()}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading
              </>
            ) : (
              <>
                <UploadCloud className="mr-2 h-4 w-4" /> Publish video
              </>
            )}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
