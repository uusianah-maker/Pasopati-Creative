// Skema Project JSON v1 (draf U02). Ternormalisasi: track berurutan, clip disimpan per ID.
// Waktu selalu dalam milidetik (integer) supaya deterministik.

export const PROJECT_SCHEMA_VERSION = 1;

export type Ratio = '9:16' | '1:1' | '16:9' | '3:4';

export const RATIO_SIZE: Record<Ratio, { width: number; height: number }> = {
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '16:9': { width: 1920, height: 1080 },
  '3:4': { width: 1080, height: 1440 },
};

export type TrackKind = 'video' | 'broll' | 'text' | 'subtitle' | 'audio' | 'effects';

export interface Track {
  id: string;
  kind: TrackKind;
  name: string;
  muted: boolean;
  locked: boolean;
  hidden: boolean;
}

export type TextPreset = 'hook' | 'usp' | 'cta' | 'sale' | 'subtitle' | 'custom';

export interface TextStyle {
  fontFamily: string;
  fontSizePx: number; // relatif terhadap tinggi canvas 1920
  color: string;
  background: string | null;
  align: 'left' | 'center' | 'right';
  // Posisi pusat teks dalam persen canvas (0–100)
  xPct: number;
  yPct: number;
}

interface ClipBase {
  id: string;
  trackId: string;
  startMs: number; // posisi di timeline
  durationMs: number;
}

export interface MediaClip extends ClipBase {
  kind: 'media';
  mediaId: string;
  versionId: string;
  sourceInMs: number; // titik mulai di file sumber
  volume: number; // 0–1
  muted: boolean;
}

export interface TextClip extends ClipBase {
  kind: 'text';
  preset: TextPreset;
  text: string;
  style: TextStyle;
}

export type Clip = MediaClip | TextClip;

export interface Project {
  schemaVersion: typeof PROJECT_SCHEMA_VERSION;
  id: string;
  workspaceId: string;
  name: string;
  ratio: Ratio;
  fps: 30;
  revision: number; // naik setiap perubahan tersimpan di server
  trackOrder: string[];
  tracks: Record<string, Track>;
  clips: Record<string, Clip>;
  archived: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export type MediaKind = 'video' | 'audio' | 'image';

export type MediaStatus =
  | 'uploading'
  | 'processing' // proxy/thumbnail sedang dibuat
  | 'ready'
  | 'failed';

export interface Media {
  id: string;
  versionId: string;
  workspaceId: string;
  name: string; // nama file dari user, hanya metadata
  kind: MediaKind;
  mimeType: string;
  sizeBytes: number;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  status: MediaStatus;
  proxyUrl: string | null; // preview ringan 540p–720p (PRD 7.1)
  thumbUrl: string | null;
  everReferenced: boolean;
  createdAt: string;
}

/** Durasi project = akhir clip paling belakang. */
export function projectDurationMs(project: Pick<Project, 'clips'>): number {
  let end = 0;
  for (const clip of Object.values(project.clips)) {
    end = Math.max(end, clip.startMs + clip.durationMs);
  }
  return end;
}
