// Operasi edit: satu-satunya cara mengubah project, baik dari timeline manual maupun Copilot.
// Undo/redo dan autosave memakai daftar operasi ini (bukan salinan project penuh, PRD 7.1).

import type { Clip, Ratio, TextStyle } from './project';

export type EditOperation =
  | { action: 'add_clip'; clip: Clip }
  | { action: 'remove_clip'; clipId: string }
  | { action: 'move_clip'; clipId: string; trackId: string; startMs: number }
  | { action: 'trim_clip'; clipId: string; startMs: number; durationMs: number; sourceInMs?: number }
  | { action: 'split_clip'; clipId: string; atMs: number; newClipId: string }
  | { action: 'update_text'; clipId: string; text?: string; style?: Partial<TextStyle> }
  | { action: 'set_volume'; clipId: string; volume?: number; muted?: boolean }
  | { action: 'set_ratio'; ratio: Ratio }
  | { action: 'rename_project'; name: string };

export type EditAction = EditOperation['action'];

/** Rencana dari Copilot (PRD 10). Netral provider; divalidasi sebelum ditampilkan. */
export interface EditPlan {
  schemaVersion: 1;
  projectRevision: number;
  operations: EditOperation[];
  rationale: string;
  costEstimate: { llmUsd: number; mediaUsd: number } | null;
  requiresApproval: true;
  /** Permintaan yang dikenali tapi belum didukung. Ditampilkan, tidak pernah dipalsukan. */
  unsupported: string[];
}
