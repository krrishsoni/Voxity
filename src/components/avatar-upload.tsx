"use client";

import { useRef, useState } from "react";
import { UserAvatar } from "@/components/avatar";
import { useToast } from "@/components/toast";

type AvatarUploadProps = {
  username: string;
  currentAvatarUrl: string | null;
};

export function AvatarUpload({ username, currentAvatarUrl }: AvatarUploadProps) {
  const { showToast } = useToast();
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast("Image must be under 2MB", "error");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setAvatarUrl(data.avatarUrl);
      showToast("🎉 Avatar updated!", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Upload failed", "error");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3">
      <UserAvatar username={username} avatarUrl={avatarUrl} size="lg" />
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{username}</p>
        <button
          type="button"
          className="mt-1 text-xs text-slate-500 underline transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Uploading…" : "Change avatar"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
