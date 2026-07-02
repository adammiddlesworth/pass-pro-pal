// Parse a YouTube URL into an 11-char video id.
// Supports: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID, /embed/ID.
export function parseYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return isYouTubeId(id) ? id : null;
    }
    if (host.endsWith("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v && isYouTubeId(v)) return v;
      const parts = u.pathname.split("/").filter(Boolean);
      const kindIdx = parts.findIndex((p) => p === "shorts" || p === "embed" || p === "live");
      if (kindIdx >= 0 && parts[kindIdx + 1] && isYouTubeId(parts[kindIdx + 1])) {
        return parts[kindIdx + 1];
      }
    }
    return null;
  } catch {
    return null;
  }
}

function isYouTubeId(v: string): boolean {
  return /^[A-Za-z0-9_-]{11}$/.test(v);
}

export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube.com/embed/${id}?rel=0`;
}
