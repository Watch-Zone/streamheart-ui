import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { createVideo } from "@/lib/videos.functions";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({
    meta: [
      { title: "Upload a video — StreamHub" },
      {
        name: "description",
        content: "Upload an MP4, add a thumbnail, tags and visibility, and publish to StreamHub.",
      },
      { property: "og:title", content: "Upload a video — StreamHub" },
      { property: "og:description", content: "Publish your video to StreamHub in a few steps." },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  function onVideoPick(file: File | null) {
    setVideoFile(file);
    if (!file) return;
    const url = URL.createObjectURL(file);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      setDuration(Math.round(probe.duration || 0));
      URL.revokeObjectURL(url);
    };
    probe.src = url;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!videoFile) {
      toast.error("Choose a video file first.");
      return;
    }
    setBusy(true);
    setProgress(10);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user!.id;
      const stamp = Date.now();
      const videoPath = `${uid}/${stamp}-${videoFile.name.replace(/[^\w.-]/g, "_")}`;

      const upload = await supabase.storage.from("videos").upload(videoPath, videoFile, {
        contentType: videoFile.type || "video/mp4",
        upsert: false,
      });
      if (upload.error) throw upload.error;
      setProgress(65);

      let thumbPath: string | null = null;
      if (thumbFile) {
        thumbPath = `${uid}/${stamp}-${thumbFile.name.replace(/[^\w.-]/g, "_")}`;
        const thumbUpload = await supabase.storage
          .from("thumbnails")
          .upload(thumbPath, thumbFile, { contentType: thumbFile.type, upsert: false });
        if (thumbUpload.error) throw thumbUpload.error;
      }
      setProgress(85);

      const result = await createVideo({
        data: {
          title,
          description,
          tags: tags
            .split(",")
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean)
            .slice(0, 12),
          visibility: visibility as "public" | "unlisted" | "private",
          duration_seconds: duration,
          video_path: videoPath,
          thumbnail_path: thumbPath,
        },
      });
      setProgress(100);
      toast.success("Video published");
      navigate({ to: "/videos/$id", params: { id: result.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-xl font-bold tracking-tight">Upload a video</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          MP4 files play best. Your video appears on{" "}
          <Link to="/dashboard" className="text-primary underline">
            your videos
          </Link>{" "}
          right after publishing.
        </p>

        <form className="mt-6 space-y-5" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="video">Video file</Label>
            <Input
              id="video"
              type="file"
              accept="video/*"
              required
              className="bg-surface"
              onChange={(e) => onVideoPick(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="thumb">Thumbnail (optional)</Label>
            <Input
              id="thumb"
              type="file"
              accept="image/*"
              className="bg-surface"
              onChange={(e) => setThumbFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              required
              maxLength={140}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-surface"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-surface"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="music, live"
                className="bg-surface"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="visibility">Visibility</Label>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger id="visibility" className="bg-surface">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="unlisted">Unlisted</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {busy && <Progress value={progress} />}

          <Button type="submit" disabled={busy} className="w-full sm:w-auto">
            {busy ? "Publishing…" : "Publish video"}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
