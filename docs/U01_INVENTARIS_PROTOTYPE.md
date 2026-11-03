# U01 — Inventaris Prototype v0.5 FIXED

| ID | Nama | Status | File/komponen | Hasil uji + bukti | Temuan | Perbaikan | Next ID | Commit status |
|---|---|---|---|---|---|---|---|---|
| U01 | Inventaris prototype | DONE (analisis statis) | `docs/reference/prototype_v0.5_FIXED.html` | Syntax JS: PASS (`node --check`). Logika parser rasio: FAIL (lihat B-01). Uji di browser nyata: NOT TESTED (Playwright baru disiapkan di U03; dijalankan ulang di AUDIT-UI-A) | 9 temuan (B-01..B-09) | Tidak diperbaiki di prototype; prototype dibuang, temuan jadi syarat di tugas U.. terkait | U02 | Commit lokal; push menunggu akses GitHub |

Tanggal: 2026-11-03 · Acuan: `PRD_MASTER.md` v1.2

## 1. Sumber & metode
- File diambil dari Google Drive folder PRD (`prototype_v0.5_FIXED.html`, 46.437 byte). Konektor Drive mengembalikan teks dengan escape Markdown; sudah dikembalikan ke HTML asli (46.445 byte, selisih hanya akhir baris). Salinan ada di `docs/reference/`.
- Struktur: 1 file, CSS ±12 KB, JS ±20 KB (vanilla, tanpa library), tanpa request jaringan.
- Metode: baca kode utuh, `node --check` untuk syntax, uji fungsi parser dengan Node. Interaksi klik di browser belum diuji.

## 2. Peta layar
Layout grid 4 kolom: rail ikon 67px · sidebar 254px · area kerja (fleksibel) · Copilot 347px. Baris: topbar 63px · preview · timeline 254px. Ada breakpoint untuk layar sedang & kecil.

| # | Layar / area | Isi |
|---|---|---|
| 1 | Rail navigasi | Editor, Template, Aset, Komponen, Preset, Skill, Render, Settings |
| 2 | Sidebar Projects | Tombol proyek baru, pencarian, daftar proyek (statis) |
| 3 | Topbar | Nama proyek (bisa diedit), badge simpan, meta resolusi/fps, Katalog Fitur, Import Media, ↓ JSON, ↧ Render |
| 4 | Preview | Pilih rasio (9:16/3:4/1:1/16:9), canvas, video, overlay teks, transport (⏮ ▶ ⏭), waktu, mute, undo |
| 5 | Timeline | Ruler, playhead, track Video, track Text, tombol ＋ Teks / ＋ CTA, klik untuk seek |
| 6 | Copilot | Riwayat chat, 3 prompt cepat, input prompt, kartu rencana (Tolak / Terapkan), badge "brain" aktif |
| 7 | Modal AI Brain Settings | Mode (local/cloud/self-host), strategi (auto/rules/AI), provider, model, endpoint, key, limit token, budget harian, wajib approval, peringatan biaya; Daftar API manual (demo); Auto-failover (urutan, retry, cooldown, simulasi) |
| 8 | Modal Katalog Fitur | Cari + filter, 29 modul (4 demo terbatas, 25 rencana) |
| 9 | Modal umum | Pesan info/error |

## 3. Interaksi yang jalan (berdasarkan kode)
- Import video lokal → `URL.createObjectURL`, durasi dari metadata, error bila codec tidak didukung.
- Ganti rasio canvas; meta resolusi ikut berubah.
- Tambah teks (via `window.prompt`) dan CTA (5 detik terakhir); klik clip teks untuk ubah isi.
- Play/pause, lompat ±5 detik, seek dengan klik timeline, mute.
- Undo (maks 50 langkah, snapshot JSON penuh). **Tidak ada redo.**
- Copilot lokal: kenali rasio, hook/intro, "elegant look", CTA/join live; fitur AI lain ditandai "belum didukung". Rencana → Tolak / Terapkan → bisa Undo.
- Export JSON project (tanpa video).
- Render → modal "belum tersedia" (jujur, tidak memalsukan MP4). ✔ sesuai PRD.
- Settings & failover: hanya di memori tab, key dikosongkan saat tutup, simulasi tanpa panggilan API. ✔ sesuai PRD.

## 4. Temuan (bug & masalah)
| ID | Tingkat | Temuan | Bukti | Dibawa ke |
|---|---|---|---|---|
| B-01 | **Tinggi** | Prompt rasio dengan spasi (`"rasio 9 : 16"`, `"3 x 4"`, `"16 :9"`) menghasilkan `"9:::16"` → `ratios[...]` undefined → `render()` crash, editor macet | Uji Node: 3 dari 5 input CRASH | U10 (parser wajib normalisasi + validasi skema) |
| B-02 | Sedang | Tidak ada redo; undo menyimpan snapshot JSON penuh (berat untuk project besar) | Kode `pushHistory/snapshot` | U07 (undo/redo berbasis operasi, PRD 7.1) |
| B-03 | Sedang | Undo setelah "Proyek Baru" memulihkan teks lama tetapi video sudah hilang → state tidak konsisten | Kode `newProject` + `undo` | U07 |
| B-04 | Sedang | `render()` membangun ulang seluruh DOM timeline setiap `timeupdate` (±4–10×/detik) dan setiap 100 ms saat play tanpa video | Kode `render`, `setInterval` | U07/U08 (virtualisasi, update playhead terpisah) |
| B-05 | Rendah | Settings membuka nilai "strategi eksekusi" yang salah: tombol Settings memakai versi `openBrain` sebelum pembungkus terakhir dipasang | Urutan reassign `openBrain` | U12 |
| B-06 | Rendah | Edit teks memakai `window.prompt` (tidak bisa styling, tidak bisa atur waktu/posisi) | Kode `addText`, klik clip | U09 (inspector teks) |
| B-07 | Rendah | Daftar proyek & "Proyek Baru" hanya mengganti state; tidak ada proyek baru di daftar | Kode `newProject` | U05 |
| B-08 | Rendah | Meta menulis 25 fps; PRD default 30 fps | `render()` | U11 |
| B-09 | Perlu cek | Emoji judul "Daftar API Manual" tampil rusak (`ð…`, UTF-8 dobel). Bisa dari file asli atau konversi Drive | Byte `303 260 302 237…` | Diabaikan (prototype dibuang); di app baru pakai ikon SVG |

## 5. Pertahankan / ubah / buang
| Elemen | Keputusan | Alasan |
|---|---|---|
| Layout 3 panel (sidebar · preview+timeline · Copilot) | **Pertahankan** | Sesuai PRD 8; sudah teruji enak dibaca |
| Tema gelap + warna aksen (violet `#8467fb`, cyan `#59d0ce`, hijau, emas) | **Pertahankan** sebagai dasar design tokens; tambah tema terang | U03/U04 |
| Kartu rencana Copilot (langkah bernomor + Tolak/Terapkan) | **Pertahankan**, tambah preview diff & terima sebagian | PRD 10 |
| Prompt cepat di Copilot | **Pertahankan** | Membantu user baru |
| Badge "brain" aktif + "0 token LLM" | **Pertahankan** | Transparansi biaya |
| Pesan jujur "belum tersedia" | **Pertahankan** sebagai label `DEMO` | Guardrail 10 |
| Settings dalam satu modal panjang | **Ubah** jadi halaman Settings bertab | PRD 8 |
| Katalog Fitur 29 modul di dalam app | **Buang** dari app; status fitur pindah ke checklist/dokumen | Mengganggu, tidak dibutuhkan user |
| Rail ikon + sidebar terpisah (dua kolom navigasi) | **Ubah** jadi satu sidebar yang bisa diciutkan | Hemat ruang di layar 1280px |
| `window.prompt` untuk input | **Buang** | Diganti inspector/form |
| Export JSON di topbar | **Pindah** ke menu project (fitur dev) | Bukan kebutuhan user harian |

## 6. Gap prototype vs PRD v1.2
| Kebutuhan PRD | Prototype | Tugas |
|---|---|---|
| Projects CRUD, login | Daftar statis | U05 |
| Timeline multitrack: move, trim, split, zoom, snap, redo | Hanya tambah teks & seek | U07 |
| Track B-roll, Subtitle, Audio, Effects | Hanya Video & Text | U06/U07 |
| Preset teks Hook/USP/CTA/Sale/Subtitle + safe zone | Hanya teks & CTA, tanpa safe zone | U08/U09 |
| Inspector (font, warna, posisi, waktu) | Tidak ada | U09 |
| Audio volume per clip | Hanya mute global | U09 |
| Copilot: diff, terima sebagian, validasi skema | Terapkan semua / tolak | U10 |
| Dialog export + preset Ringan/Standar/Tinggi + estimasi ukuran | Modal "belum tersedia" | U11 |
| Render Queue, riwayat versi, status autosave | Badge statis | U11 |
| Settings bertab: provider manager, budget, default export | Satu modal | U12 |
| Media Library, Trash, hapus permanen 2 langkah | Tidak ada | U13 |
| Budget performa (bundle, LCP, INP, 60 fps, memori) | Belum diukur; B-04 berlawanan dengan 7.1 | U03 (CI), U07, U14 |
| Mode layar <1280px untuk review saja | Layout menyusut paksa | U04 |

## 7. Bekal untuk U02
- Komponen inti yang perlu dibuat: AppShell, Sidebar, ProjectList, EditorLayout, PreviewCanvas, Transport, Timeline (Track, Clip, Ruler, Playhead), Inspector, CopilotPanel (PlanCard), ExportDialog, RenderQueue, SettingsTabs, MediaLibrary, Trash.
- Contoh prompt yang wajib didukung parser lokal U10 (dari prototype): "Buat hook elegan untuk Lucy Pants, tambahkan CTA join live di akhir", "Ubah rasio jadi 3:4 dan tambahkan teks Elegant Look", "Tambah CTA Join Live Sekarang", plus variasi spasi rasio (B-01).
- Prototype tidak memakai library apa pun (±32 KB total). Patokan: app baru boleh lebih besar, tapi tetap dalam budget PRD 7.1.
