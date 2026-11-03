// Kontrak servis (U02). UI hanya boleh bicara dengan interface ini.
// Fase 1: implementasi mock (src/services/mock). Fase 2: implementasi HTTP ke backend, UI tidak berubah.

import type { EditOperation, EditPlan } from '@/domain/operations';
import type { Media, Project, Ratio } from '@/domain/project';
import type { ExportPresetId } from '@/domain/export';

/** Penanda data palsu. UI wajib menampilkan label DEMO bila true (guardrail 10). */
export interface ServiceMeta {
  isMock: boolean;
}

// ---------- Auth ----------
export interface Session {
  userId: string;
  email: string;
  displayName: string;
  workspaceId: string;
}

export interface AuthService extends ServiceMeta {
  getSession(): Promise<Session | null>;
  signInWithEmail(email: string): Promise<{ sent: boolean }>;
  signInWithGoogle(): Promise<Session>;
  signOut(): Promise<void>;
}

// ---------- Projects ----------
export interface ProjectSummary {
  id: string;
  name: string;
  ratio: Ratio;
  durationMs: number;
  thumbUrl: string | null;
  archived: boolean;
  updatedAt: string;
}

export interface ProjectVersion {
  revision: number;
  label: string | null; // versi bernama
  createdAt: string;
  operationCount: number;
}

export type SaveResult =
  | { ok: true; revision: number }
  | { ok: false; reason: 'conflict'; serverRevision: number }
  | { ok: false; reason: 'offline' | 'error'; message: string };

export interface ProjectService extends ServiceMeta {
  list(opts?: { includeArchived?: boolean }): Promise<ProjectSummary[]>;
  get(id: string): Promise<Project>;
  create(input: { name: string; ratio: Ratio }): Promise<Project>;
  rename(id: string, name: string): Promise<void>;
  setArchived(id: string, archived: boolean): Promise<void>;
  remove(id: string): Promise<void>;
  /** Autosave berbasis operasi (PRD 7.1): kirim hanya perubahan sejak baseRevision. */
  saveOperations(id: string, baseRevision: number, ops: EditOperation[]): Promise<SaveResult>;
  listVersions(id: string): Promise<ProjectVersion[]>;
}

// ---------- Media ----------
export interface UploadHandle {
  mediaId: string;
  cancel(): void;
  done: Promise<Media>;
}

export interface MediaService extends ServiceMeta {
  list(opts?: { projectId?: string }): Promise<Media[]>;
  get(mediaId: string): Promise<Media>;
  /** Upload resumable. onProgress 0–1. File ditolak bila format tidak didukung (PRD 7). */
  upload(file: File, opts: { projectId?: string; onProgress?: (p: number) => void }): UploadHandle;
  /** URL preview ringan (proxy). Di mock: object URL dari file lokal. */
  previewUrl(mediaId: string): Promise<string | null>;
}

// ---------- Render ----------
export type RenderStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface RenderJob {
  id: string;
  projectId: string;
  projectName: string;
  revision: number;
  preset: ExportPresetId;
  width: number;
  height: number;
  fps: number;
  status: RenderStatus;
  progress: number; // 0–1
  estimatedBytes: number;
  actualBytes: number | null;
  downloadUrl: string | null; // null di mock: tidak ada file MP4 nyata
  error: string | null;
  createdAt: string;
}

export interface RenderService extends ServiceMeta {
  enqueue(input: { projectId: string; revision: number; preset: ExportPresetId; audioMono?: boolean }): Promise<RenderJob>;
  list(): Promise<RenderJob[]>;
  cancel(jobId: string): Promise<void>;
  /** Berlangganan perubahan status. Mengembalikan fungsi berhenti langganan. */
  subscribe(listener: (job: RenderJob) => void): () => void;
}

// ---------- AI Copilot ----------
export type BrainMode = 'local' | 'cloud' | 'selfhost';
export type ExecutionStrategy = 'auto' | 'rules' | 'ai';

export interface PlanContext {
  project: Project;
  selectedClipIds: string[];
  playheadMs: number;
}

export interface BrainStatus {
  mode: BrainMode;
  strategy: ExecutionStrategy;
  activeProvider: string | null;
  connected: boolean;
  llmTokensUsedToday: number;
}

export interface AIService extends ServiceMeta {
  plan(prompt: string, ctx: PlanContext): Promise<EditPlan>;
  status(): Promise<BrainStatus>;
}

// ---------- Provider (Settings) ----------
export type ProviderCapability = 'planner' | 'stt' | 'vision' | 'video';

export interface ProviderConnection {
  id: string;
  provider: string; // openai | anthropic | gemini | openrouter | azure-openai | ollama | custom
  name: string;
  model: string;
  maskedKeySuffix: string | null; // contoh "…a1b2"; key asli tidak pernah dikembalikan
  capabilities: ProviderCapability[];
  priority: number;
  enabled: boolean;
  lastTest: { ok: boolean; at: string; message: string } | null;
}

export interface RoutingSettings {
  strategy: ExecutionStrategy;
  failoverEnabled: boolean;
  maxRetries: number;
  cooldownSec: number;
  maxTokensPerPlan: number;
  dailyBudgetUsd: number;
  monthlyBudgetUsd: number;
  requireApproval: true;
}

export interface ProviderService extends ServiceMeta {
  list(): Promise<ProviderConnection[]>;
  /** Key dikirim sekali; di mock hanya disimpan di memori tab, tidak pernah ke storage browser. */
  add(input: { provider: string; name: string; model: string; apiKey: string; capabilities: ProviderCapability[] }): Promise<ProviderConnection>;
  remove(id: string): Promise<void>;
  test(id: string): Promise<ProviderConnection['lastTest']>;
  reorder(ids: string[]): Promise<void>;
  getRouting(): Promise<RoutingSettings>;
  saveRouting(settings: RoutingSettings): Promise<void>;
}

// ---------- Storage & Trash ----------
export interface StorageUsage {
  usedBytes: number;
  quotaBytes: number;
  trashBytes: number; // tetap ditagih sampai dihapus permanen (PRD 14.2)
}

export interface TrashItem {
  mediaId: string;
  versionId: string;
  name: string;
  sizeBytes: number;
  trashedAt: string;
  reason: 'manual' | 'auto';
  referencedBy: string[]; // nama project; kalau tidak kosong, purge diblok
}

export interface UnusedMediaItem {
  media: Media;
  unreferencedSince: string | null; // null = belum pernah dipakai (dilindungi)
}

export interface StorageService extends ServiceMeta {
  usage(): Promise<StorageUsage>;
  unusedReport(): Promise<UnusedMediaItem[]>;
  listTrash(): Promise<TrashItem[]>;
  moveToTrash(mediaId: string, versionId: string): Promise<void>;
  restore(mediaId: string, versionId: string): Promise<{ ok: boolean; message: string }>;
  /** Hapus permanen: wajib token konfirmasi terpisah + audit dependensi ulang (PRD 14.4). */
  requestPurge(items: { mediaId: string; versionId: string }[]): Promise<{ confirmToken: string; blocked: TrashItem[] }>;
  confirmPurge(confirmToken: string): Promise<{ purged: number; blocked: TrashItem[] }>;
}

export interface Services {
  auth: AuthService;
  projects: ProjectService;
  media: MediaService;
  render: RenderService;
  ai: AIService;
  providers: ProviderService;
  storage: StorageService;
}
