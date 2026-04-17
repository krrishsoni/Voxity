"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";

type OptionState = {
  id: string;
  text: string;
  imageFile: File | null;
};

const privacyModes = ["public", "friends", "private"] as const;

export function CreatePollForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isBlind, setIsBlind] = useState(false);
  const [isEphemeral, setIsEphemeral] = useState(false);
  const [privacyMode, setPrivacyMode] = useState<(typeof privacyModes)[number]>("public");
  const [options, setOptions] = useState<OptionState[]>([
    { id: crypto.randomUUID(), text: "", imageFile: null },
    { id: crypto.randomUUID(), text: "", imageFile: null },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nonEmptyOptions = options.filter((option) => option.text.trim().length > 0).length;

  const expiresAt = isEphemeral ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;

  function addOption() {
    setOptions((current) => [...current, { id: crypto.randomUUID(), text: "", imageFile: null }]);
  }

  function removeOption(id: string) {
    setOptions((current) => current.filter((option) => option.id !== id));
  }

  function updateOption(id: string, patch: Partial<OptionState>) {
    setOptions((current) => current.map((option) => (option.id === id ? { ...option, ...patch } : option)));
  }

  function moveOption(id: string, direction: "up" | "down") {
    setOptions((current) => {
      const index = current.findIndex((item) => item.id === id);
      if (index < 0) return current;

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.length) return current;

      const copied = [...current];
      const [moved] = copied.splice(index, 1);
      copied.splice(targetIndex, 0, moved);
      return copied;
    });
  }

  async function uploadOptionImage(file: File) {
    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `poll-options/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("poll-option-images")
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from("poll-option-images").getPublicUrl(filePath);
    return data.publicUrl;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const cleanOptions = options
        .map((option) => ({ ...option, text: option.text.trim() }))
        .filter((option) => option.text.length > 0);

      if (cleanOptions.length < 2) {
        setError("Please add at least two options.");
        setLoading(false);
        return;
      }

      const uploaded = await Promise.all(
        cleanOptions.map(async (option) => {
          const image_url = option.imageFile ? await uploadOptionImage(option.imageFile) : null;
          return { text: option.text, image_url };
        }),
      );

      const payload = {
        title,
        description,
        is_blind: isBlind,
        is_ephemeral: isEphemeral,
        privacy_mode: privacyMode,
        options: uploaded,
      };

      const response = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create poll");
      }

      showToast("✅ Poll created! Redirecting…", "success");
      router.push(`/host/${data.pollId}/lobby`);
    } catch (submitError) {
      const msg = submitError instanceof Error ? submitError.message : "Could not create poll.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[1.3fr_0.7fr]">
      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="section-title">Create Poll</h1>
          <span className="chip">{nonEmptyOptions} option(s) ready</span>
        </div>

        <input
          className="input-base"
          placeholder="Poll title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          minLength={3}
          maxLength={160}
          required
        />
        <textarea
          className="input-base min-h-24"
          placeholder="Description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="toggle-pill">
            Blind mode
            <input type="checkbox" checked={isBlind} onChange={(e) => setIsBlind(e.target.checked)} />
          </label>
          <label className="toggle-pill">
            Ephemeral (24h)
            <input type="checkbox" checked={isEphemeral} onChange={(e) => setIsEphemeral(e.target.checked)} />
          </label>
          <label className="toggle-pill block">
            <span className="mb-1 block text-slate-500">Privacy</span>
            <select
              className="w-full bg-transparent text-slate-900 outline-none"
              value={privacyMode}
              onChange={(e) => setPrivacyMode(e.target.value as (typeof privacyModes)[number])}
            >
              {privacyModes.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Options</p>
            <button type="button" onClick={addOption} className="btn-secondary">
              Add option
            </button>
          </div>

          <AnimatePresence>
            {options.map((option, index) => (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="inner-card p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Option {index + 1}</span>
                  <div className="flex items-center gap-1">
                    <button type="button" className="btn-ghost px-2 py-1" onClick={() => moveOption(option.id, "up")}>
                      Up
                    </button>
                    <button type="button" className="btn-ghost px-2 py-1" onClick={() => moveOption(option.id, "down")}>
                      Down
                    </button>
                    {options.length > 2 ? (
                      <button type="button" className="btn-ghost px-2 py-1 text-rose-600" onClick={() => removeOption(option.id)}>
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <input
                    className="input-base"
                    value={option.text}
                    placeholder={`Option ${index + 1}`}
                    onChange={(event) => updateOption(option.id, { text: event.target.value })}
                  />
                  <input
                    className="block w-full text-sm"
                    type="file"
                    accept="image/*"
                    onChange={(event) => updateOption(option.id, { imageFile: event.target.files?.[0] || null })}
                  />
                  {option.imageFile ? <p className="text-xs text-slate-500">Image: {option.imageFile.name}</p> : null}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">{error}</p> : null}

        <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
          {loading ? "Creating..." : "Create poll"}
        </button>
      </section>

      <aside className="card space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Live Summary</h2>
        <div className="inner-card p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">Title</p>
          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{title || "Untitled poll"}</p>
        </div>
        <div className="inner-card p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">Privacy</p>
          <p className="mt-1 text-sm font-medium capitalize text-slate-900 dark:text-slate-100">{privacyMode}</p>
        </div>
        <div className="inner-card p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">Blind mode</p>
          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{isBlind ? "Enabled" : "Disabled"}</p>
        </div>
        <div className="inner-card p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">Expires</p>
          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
            {expiresAt ? expiresAt.toLocaleString() : "No expiry"}
          </p>
        </div>
      </aside>
    </form>
  );
}
