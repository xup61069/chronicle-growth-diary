export type TimelineMedia = { mediaKind?: "image" | "live_motion"; url: string; caption?: string | null };

/** Live Photo companion MOV files remain private media, never a timeline cover image. */
export function isStaticImageMedia(media: TimelineMedia) {
  return media.mediaKind !== "live_motion";
}

export function getStaticImageMedia<T extends TimelineMedia>(media: T[]) {
  return media.filter(isStaticImageMedia);
}

export function getPrimaryStaticImage<T extends TimelineMedia>(media: T[]) {
  return media.find(isStaticImageMedia) ?? null;
}
