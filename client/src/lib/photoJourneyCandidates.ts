import { buildPhotoExifImportGroups, isValidCapturedAt, MAX_EXIF_IMPORT_IMAGES_PER_EVENT, type PhotoExifImportCandidate, type PhotoExifImportGroup } from "./photoExifImport";

export const MIN_PHOTOS_PER_JOURNEY_CANDIDATE = 3;
export const MAX_JOURNEY_CANDIDATE_GAP_MS = 30 * 60 * 60 * 1000;
export const MAX_JOURNEY_CANDIDATE_STEP_DISTANCE_KM = 80;

type JourneyPhoto = Pick<PhotoExifImportCandidate, "id" | "capturedAt" | "latitude" | "longitude">;

export type PhotoJourneyCandidate = {
  id: string;
  photoIds: string[];
  startedAt: string;
  endedAt: string;
  title: string;
  coverPhotoId: string;
  latitude: number;
  longitude: number;
  reason: string;
};

type LocatedJourneyPhoto = JourneyPhoto & {
  timestamp: number;
  latitudeNumber: number;
  longitudeNumber: number;
};

function toValidCoordinate(value: string, maximumAbsoluteValue: number) {
  const coordinate = Number(value);
  if (!Number.isFinite(coordinate) || Math.abs(coordinate) > maximumAbsoluteValue) return null;
  return coordinate;
}

function asLocatedJourneyPhoto(photo: JourneyPhoto): LocatedJourneyPhoto | null {
  if (!isValidCapturedAt(photo.capturedAt)) return null;
  const timestamp = new Date(photo.capturedAt).getTime();
  const latitudeNumber = toValidCoordinate(photo.latitude, 90);
  const longitudeNumber = toValidCoordinate(photo.longitude, 180);
  if (Number.isNaN(timestamp) || latitudeNumber === null || longitudeNumber === null) return null;
  return { ...photo, timestamp, latitudeNumber, longitudeNumber };
}

function haversineDistanceKm(left: LocatedJourneyPhoto, right: LocatedJourneyPhoto) {
  const toRadians = (value: number) => value * Math.PI / 180;
  const latitudeDelta = toRadians(right.latitudeNumber - left.latitudeNumber);
  const longitudeDelta = toRadians(right.longitudeNumber - left.longitudeNumber);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(left.latitudeNumber)) * Math.cos(toRadians(right.latitudeNumber)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6_371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function roundCoordinate(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

/** Uses a spherical mean so candidates on either side of the date line remain near their actual photos. */
function geographicCenter(photos: LocatedJourneyPhoto[]) {
  let x = 0;
  let y = 0;
  let z = 0;
  for (const photo of photos) {
    const latitude = photo.latitudeNumber * Math.PI / 180;
    const longitude = photo.longitudeNumber * Math.PI / 180;
    x += Math.cos(latitude) * Math.cos(longitude);
    y += Math.cos(latitude) * Math.sin(longitude);
    z += Math.sin(latitude);
  }
  const longitude = Math.atan2(y, x);
  const hypotenuse = Math.sqrt(x ** 2 + y ** 2);
  const latitude = Math.atan2(z, hypotenuse);
  return { latitude: roundCoordinate(latitude * 180 / Math.PI), longitude: roundCoordinate(longitude * 180 / Math.PI) };
}

function formatDateRange(startedAt: string, endedAt: string) {
  const start = startedAt.slice(0, 10).replaceAll("-", " 年 ").replace(/^(.+) 年 (.+) 年 (.+)$/, "$1 年 $2 月 $3 日");
  const end = endedAt.slice(0, 10).replaceAll("-", " 年 ").replace(/^(.+) 年 (.+) 年 (.+)$/, "$1 年 $2 月 $3 日");
  return start === end ? start : `${start} 至 ${end}`;
}

function candidateFromSegment(photos: LocatedJourneyPhoto[], sequence: number): PhotoJourneyCandidate | null {
  if (photos.length < MIN_PHOTOS_PER_JOURNEY_CANDIDATE) return null;
  const first = photos[0];
  const last = photos.at(-1)!;
  const center = geographicCenter(photos);
  return {
    id: `journey-${first.timestamp}-${last.timestamp}-${sequence}`,
    photoIds: photos.map((photo) => photo.id),
    startedAt: first.capturedAt,
    endedAt: last.capturedAt,
    title: `照片旅程候選：${formatDateRange(first.capturedAt, last.capturedAt)}`,
    coverPhotoId: first.id,
    latitude: center.latitude,
    longitude: center.longitude,
    reason: `連續 ${photos.length} 張具 GPS 與拍攝時間的照片；相鄰相片間隔不超過 30 小時，移動距離不超過 80 公里。`,
  };
}

export function isValidPhotoJourneyRange(candidate: Pick<PhotoJourneyCandidate, "startedAt" | "endedAt">) {
  if (!isValidCapturedAt(candidate.startedAt) || !isValidCapturedAt(candidate.endedAt)) return false;
  return new Date(candidate.startedAt).getTime() <= new Date(candidate.endedAt).getTime();
}

/** Applies only review-local edits and preserves the candidate's source-photo membership. */
export function updatePhotoJourneyCandidate(candidate: PhotoJourneyCandidate, update: Partial<Pick<PhotoJourneyCandidate, "title" | "startedAt" | "endedAt" | "coverPhotoId">>): PhotoJourneyCandidate {
  const next = { ...candidate, ...update };
  if (!next.photoIds.includes(next.coverPhotoId)) return candidate;
  return next;
}

/**
 * Produces review-only candidates from the currently selected photos. It is pure,
 * does not inspect file bytes, and makes no network or persistence requests.
 */
export function buildPhotoJourneyCandidates(photos: JourneyPhoto[]): PhotoJourneyCandidate[] {
  const located = photos
    .map(asLocatedJourneyPhoto)
    .filter((photo): photo is LocatedJourneyPhoto => photo !== null)
    .sort((left, right) => left.timestamp - right.timestamp || left.id.localeCompare(right.id));

  const candidates: PhotoJourneyCandidate[] = [];
  let segment: LocatedJourneyPhoto[] = [];
  for (const photo of located) {
    const previous = segment.at(-1);
    const startsNewSegment = previous && (
      photo.timestamp - previous.timestamp > MAX_JOURNEY_CANDIDATE_GAP_MS
      || haversineDistanceKm(previous, photo) > MAX_JOURNEY_CANDIDATE_STEP_DISTANCE_KM
    );
    if (startsNewSegment) {
      const candidate = candidateFromSegment(segment, candidates.length + 1);
      if (candidate) candidates.push(candidate);
      segment = [];
    }
    segment.push(photo);
  }
  const candidate = candidateFromSegment(segment, candidates.length + 1);
  if (candidate) candidates.push(candidate);
  return candidates;
}

/** Converts only owner-selected review candidates into the existing private photo-import group contract. */
export function buildPhotoJourneyImportGroups(photos: PhotoExifImportCandidate[], candidates: PhotoJourneyCandidate[]): PhotoExifImportGroup[] {
  const photosById = new Map(photos.map((photo) => [photo.id, photo]));
  return candidates.flatMap((candidate) => {
    const matchedPhotos = candidate.photoIds.map((id) => photosById.get(id)).filter((photo): photo is PhotoExifImportCandidate => Boolean(photo));
    const chunks = Array.from({ length: Math.ceil(matchedPhotos.length / MAX_EXIF_IMPORT_IMAGES_PER_EVENT) }, (_, index) => matchedPhotos.slice(index * MAX_EXIF_IMPORT_IMAGES_PER_EVENT, (index + 1) * MAX_EXIF_IMPORT_IMAGES_PER_EVENT));
    return chunks.map((chunk, index) => ({
      id: `${candidate.id}-${index + 1}`,
      date: chunk[0]!.capturedAt.slice(0, 10),
      occurredAt: new Date(candidate.startedAt).getTime(),
      title: chunks.length > 1 ? `${candidate.title}（第 ${index + 1} 批）` : candidate.title,
      files: chunk.map((photo) => photo.file),
      photoIds: chunk.map((photo) => photo.id),
      mapLatitudeE6: Math.round(candidate.latitude * 1_000_000),
      mapLongitudeE6: Math.round(candidate.longitude * 1_000_000),
      journey: {
        startedAt: candidate.startedAt,
        endedAt: candidate.endedAt,
        coverPhotoId: chunk.some((photo) => photo.id === candidate.coverPhotoId) ? candidate.coverPhotoId : null,
      },
    }));
  });
}

/** Selected journey candidates replace their photos' ordinary date groups; no photo can enter two private events. */
export function mergePhotoJourneyImportGroups(photos: PhotoExifImportCandidate[], candidates: PhotoJourneyCandidate[], selectedCandidateIds: string[]): PhotoExifImportGroup[] {
  const selectedIds = new Set(selectedCandidateIds);
  const selectedCandidates = candidates.filter((candidate) => selectedIds.has(candidate.id));
  const journeyGroups = buildPhotoJourneyImportGroups(photos, selectedCandidates);
  const journeyPhotoIds = new Set(journeyGroups.flatMap((group) => group.photoIds));
  const remainingGroups = buildPhotoExifImportGroups(photos.filter((photo) => !journeyPhotoIds.has(photo.id)));
  return [...journeyGroups, ...remainingGroups].sort((left, right) => left.occurredAt - right.occurredAt || left.id.localeCompare(right.id));
}
