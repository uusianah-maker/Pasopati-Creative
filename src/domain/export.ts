// Preset export ringan (PRD 7.2). Angka bitrate = titik tengah target; dikalibrasi ulang di B06.

export type ExportPresetId = 'ringan' | 'standar' | 'tinggi';

export interface ExportPreset {
  id: ExportPresetId;
  label: string;
  maxHeight: 720 | 1080;
  videoKbps: number;
  audioKbps: number;
  note: string;
}

export const EXPORT_PRESETS: Record<ExportPresetId, ExportPreset> = {
  ringan: { id: 'ringan', label: 'Ringan', maxHeight: 720, videoKbps: 2000, audioKbps: 128, note: 'Draft, review, kirim WA' },
  standar: { id: 'standar', label: 'Standar (Sosmed)', maxHeight: 1080, videoKbps: 4000, audioKbps: 128, note: 'Upload TikTok/IG/Shopee' },
  tinggi: { id: 'tinggi', label: 'Tinggi', maxHeight: 1080, videoKbps: 8000, audioKbps: 192, note: 'Iklan / master' },
};

export const DEFAULT_EXPORT_PRESET: ExportPresetId = 'standar';

/** Estimasi ukuran file (byte) dari bitrate × durasi. Rentang ±20% untuk ditampilkan ke user. */
export function estimateExportBytes(presetId: ExportPresetId, durationMs: number, audioMono = false) {
  const p = EXPORT_PRESETS[presetId];
  const audioKbps = audioMono ? Math.round(p.audioKbps / 2) : p.audioKbps;
  const bytes = Math.round(((p.videoKbps + audioKbps) * 1000 * (durationMs / 1000)) / 8);
  return { bytes, minBytes: Math.round(bytes * 0.8), maxBytes: Math.round(bytes * 1.2) };
}

/** Resolusi output: tidak pernah upscale melebihi sumber (PRD 7.2). */
export function outputSize(canvas: { width: number; height: number }, presetId: ExportPresetId, sourceHeight?: number) {
  const limit = Math.min(EXPORT_PRESETS[presetId].maxHeight, sourceHeight ?? Infinity);
  // Batasi sisi pendek ke limit, jaga rasio, bulatkan ke genap (syarat H.264).
  const short = Math.min(canvas.width, canvas.height);
  const scale = Math.min(1, limit / short);
  const even = (n: number) => Math.max(2, Math.round((n * scale) / 2) * 2);
  return { width: even(canvas.width), height: even(canvas.height) };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}
