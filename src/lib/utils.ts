import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Clamp per-attempt duration to a sane maximum so an abandoned tab that
 * eventually gets submitted doesn't inflate totals.
 */
export function computeAttemptSeconds(input: {
  started_at: string;
  completed_at: string | null;
  exam_id: string | null;
  question_count?: number | null;
  is_timed_final?: boolean | null;
  time_limit_minutes?: number | null;
}): number {
  if (!input.completed_at) return 0;
  const start = new Date(input.started_at).getTime();
  const end = new Date(input.completed_at).getTime();
  if (!isFinite(start) || !isFinite(end) || end <= start) return 0;

  const raw = Math.floor((end - start) / 1000);
  let cap: number;
  if (!input.exam_id) {
    // review / weekly mix
    cap = 90 * 60;
  } else if (input.is_timed_final && input.time_limit_minutes) {
    cap = input.time_limit_minutes * 60;
  } else {
    const q = input.question_count ?? 0;
    const est = q * 2 * 60; // 2 min per question
    cap = Math.min(3 * 60 * 60, Math.max(15 * 60, est));
  }
  return Math.min(raw, cap);
}

export function formatStudyDuration(seconds: number): string {
  if (!seconds || seconds < 60) return seconds > 0 ? "< 1m" : "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
