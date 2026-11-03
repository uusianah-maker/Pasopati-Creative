# U02 — ADR Frontend & Kontrak Servis

| ID | Nama | Status | File/komponen | Hasil uji + bukti | Temuan | Perbaikan | Next ID | Commit status |
|---|---|---|---|---|---|---|---|---|
| U02 | ADR frontend + kontrak servis | DONE | `docs/U02_ADR_FRONTEND.md`, `src/domain/*`, `src/services/contracts.ts` | Typecheck kontrak & domain: PASS (`tsc --noEmit` strict, TypeScript 6.0.3). Unit test fungsi export dibuat di U03 | Kontrak butuh `ProviderService` (tidak ada di daftar PRD 12) | Ditambahkan; PRD 12 diperbarui di changelog berikutnya | U03 | Branch `u02-adr-kontrak-servis` |

Tanggal: 2026-11-03 · Acuan: `PRD_MASTER.md` v1.2

## 1. Keputusan

| # | Keputusan | Pilihan | Alasan | Alternatif yang ditolak |
|---|---|---|---|---|
| A1 | Framework | **Next.js 16.4.2 (App Router) + React 19.3.1** | Sesuai PRD 12; satu codebase untuk UI sekarang dan API nanti; code splitting per route otomatis | Vite SPA (perlu server terpisah nanti) |
| A2 | Bahasa | **TypeScript 6.0.3**, mode strict | TS 7 (native) masih baru dan belum jelas dukungannya di tooling Next/ESLint | TS 7.0 |
| A3 | Styling | **CSS Modules + CSS variables (design tokens)** | 0 KB runtime, tanpa dependency; token tema gelap dari prototype (U01) | Tailwind (oke, tapi tambah tooling), CSS-in-JS (ada runtime → berat) |
| A4 | State editor | **Zustand 5.0.15** (±1 KB gzip) | Subscribe per bagian state → timeline tidak render ulang semua (perbaikan B-04) | Redux (lebih besar), Context murni (render ulang luas) |
| A5 | Validasi skema | **Valibot 1.5.0** (modular, ±1–3 KB yang terpakai) | Validasi EditPlan Copilot & project di client dan server dengan kode yang sama | Zod (lebih besar di bundle) |
| A6 | Ikon | **lucide-react 1.59.0**, impor per ikon | Hanya ikon yang dipakai ikut bundle; ganti emoji rusak (B-09) | Emoji, icon font (berat) |
| A7 | Drag, trim, virtualisasi timeline | **Ditulis sendiri** (pointer events) | Kebutuhan spesifik timeline; library DnD umum berat dan tidak pas untuk trim | dnd-kit, react-window |
| A8 | Unit test | **Vitest 4.1.12** + jsdom | Cepat, cocok dengan TS | Jest |
| A9 | E2E | **Playwright 1.64.1** (Chromium) | Browser target MVP = Chrome/Edge | Cypress |
| A10 | Lint | **ESLint 9.39.5** + eslint-config-next 16.4.2 | ESLint 10 belum didukung semua plugin React | ESLint 10 |
| A11 | Budget bundle | **Script sendiri** baca hasil build, gzip per route, gagal bila > budget | Tanpa dependency tambahan; angka sesuai PRD 7.1 | size-limit |
| A12 | ID | `crypto.randomUUID()` bawaan browser | 0 KB | nanoid/uuid |
| A13 | Font | System font stack (tanpa web font) di fase UI | 0 KB, cepat; web font maks 2 keluarga bila diputuskan nanti | Google Fonts |

Semua versi dikunci persis (tanpa `^`) dan dipilih yang rilis paling lambat 20 Oktober 2026 (≥ 2 minggu), supaya tidak memakai rilis yang baru keluar.

**Library yang sengaja tidak dipakai:** ffmpeg.wasm (terlalu berat, render di server), moment/dayjs (cukup `Intl`), lodash, UI kit besar (MUI/Ant).

## 2. Struktur folder
```
src/
  app/                 # route Next.js (projects, editor/[id], render, assets, trash, settings, login)
  components/          # komponen UI per area (shell, projects, editor/timeline, copilot, ...)
  domain/              # tipe & logika murni tanpa React: project, operations, export
  services/
    contracts.ts       # interface servis — satu-satunya pintu UI ke data
    mock/              # implementasi palsu fase 1 (isMock = true → label DEMO)
    index.ts           # memilih implementasi (mock sekarang, http nanti)
  styles/tokens.css    # design tokens terang/gelap
docs/                  # laporan per tugas
```

## 3. Kontrak servis
Lengkap di `src/services/contracts.ts`. Semua method async, jadi mock dan backend nyata punya bentuk yang sama.

| Servis | Dipakai di | Catatan |
|---|---|---|
| AuthService | Login, shell | Magic link + Google (D3, belum final) |
| ProjectService | Projects, editor, autosave | `saveOperations(id, baseRevision, ops)`: autosave hanya mengirim operasi; konflik revisi dilaporkan |
| MediaService | Upload, media bin, library | Upload dengan progress & cancel; preview selalu lewat `previewUrl` (proxy) |
| RenderService | Dialog export, Render Queue | 4 status; `downloadUrl` null di mock (tidak memalsukan MP4) |
| AIService | Copilot | Mengembalikan `EditPlan`; `unsupported[]` untuk permintaan yang belum bisa |
| ProviderService | Settings | **Tambahan dari PRD 12.** Key tidak pernah dikembalikan, hanya `maskedKeySuffix` |
| StorageService | Assets, Trash | Purge 2 langkah: `requestPurge` → `confirmPurge(token)` |

Setiap servis punya `isMock`. Komponen `DemoBadge` (U04) membaca flag ini untuk memasang label `DEMO`.

Mock dibuat bertahap bersama tugas yang memakainya (Auth & Project di U04–U05, Media di U08, AI di U10, Render di U11, Provider di U12, Storage di U13).

## 4. Skema Project JSON v1 (draf)
File: `src/domain/project.ts`, `src/domain/operations.ts`.
- **Ternormalisasi:** `trackOrder[]` + `tracks{id}` + `clips{id}`. Mengubah satu clip tidak menyalin seluruh project.
- **Waktu dalam ms integer** → playhead deterministik.
- **Clip:** `media` (mediaId + versionId immutable, sourceInMs, volume) atau `text` (preset Hook/USP/CTA/Sale/Subtitle/Custom, style, posisi %).
- **Track:** video, broll, text, subtitle, audio, effects.
- **Operasi edit** (`EditOperation`): add/remove/move/trim/split clip, update_text, set_volume, set_ratio, rename_project. Timeline manual dan Copilot memakai operasi yang sama → undo/redo, autosave diff, dan validasi rencana AI cukup satu jalur.
- **EditPlan** sesuai PRD 10: `schemaVersion, projectRevision, operations, rationale, costEstimate, requiresApproval, unsupported`.

## 5. Export ringan
`src/domain/export.ts`: preset Ringan 720p ±2 Mbps, Standar 1080p ±4 Mbps (default), Tinggi 1080p ±8 Mbps; fungsi estimasi ukuran (±20%), resolusi output tanpa upscale, format ukuran ke "15,4 MB". Contoh: 30 detik Standar ≈ 15,5 MB (rentang 12–19 MB), sesuai PRD 7.2.

## 6. Risiko & catatan
- Repo GitHub berstatus **public**: jangan pernah commit secret/.env. Diperiksa sebelum tiap commit.
- Next.js 16 punya runtime dasar ±100 KB gzip; sisa budget halaman Projects ±100 KB. Harus dijaga sejak U04.
