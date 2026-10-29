"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchContentIndex, levelsFor } from "@/hooks/use-content-index";
import type { Profile } from "@/learning/types";
import { replanTodayIfUnstarted } from "@/lib/session/today";
import { updateProfile } from "@/storage/meta";

/** When the change reaches the daily lesson: today when it hadn't started, else tomorrow. */
function startsWhen(replanned: boolean): string {
  return replanned ? "từ Bài học hôm nay" : "từ ngày mai (bài hôm nay bạn đã bắt đầu)";
}

/**
 * Follow or stop following a vocabulary set (feature 012, AC-007, AC-010).
 * Writes `profile.vocabSet`, plans today's lesson again when it hasn't
 * started, and says from when the change applies.
 */
export function useFollowSet() {
  const client = useQueryClient();
  const [pending, setPending] = useState(false);

  /** Saves the choice; null when it couldn't be saved, else whether today's lesson was planned again. */
  async function change(vocabSet: string | undefined): Promise<boolean | null> {
    setPending(true);
    const now = Date.now();
    let profile: Profile;
    try {
      profile = await updateProfile({ vocabSet }, now);
    } catch {
      setPending(false);
      toast.error("Chưa lưu được. Bạn thử lại nhé.");
      return null;
    }
    try {
      const { index, version } = await fetchContentIndex(client, levelsFor(profile.level));
      return await replanTodayIfUnstarted({ profile, index, contentVersion: version, now });
    } catch {
      // Content didn't load (offline): the choice is saved and applies to the next lesson planned.
      return false;
    } finally {
      setPending(false);
    }
  }

  async function follow(setId: string, title: string) {
    const replanned = await change(setId);
    if (replanned !== null) toast.success(`Bạn đang học bộ “${title}”. Từ mới sẽ lấy từ bộ này ${startsWhen(replanned)}.`);
  }

  async function unfollow(title: string) {
    const replanned = await change(undefined);
    if (replanned !== null) toast.success(`Đã ngừng học bộ “${title}”. Từ mới sẽ lại theo trình độ của bạn ${startsWhen(replanned)}.`);
  }

  return { follow, unfollow, pending };
}
