---
trigger: always_on
---

# Comprehensive Antigravity Turbo Mode Governance Rules

## 1. Pre-Execution & Context Alignment (Fase Analisis Awal)
- **Deep Codebase Inspection:** Sebelum melakukan modifikasi apa pun, agen wajib memindai struktur proyek, membaca file dokumentasi utama (`README.md`, `CONTRIBUTING.md`), serta mengenali *coding style* dan pola arsitektur yang sudah digunakan.
- **Dependency & Tech Stack Compliance:** Wajib menggunakan teknologi, pustaka, dan framework yang sudah ada di dalam proyek. Dilarang mengubah versi framework mayor tanpa persetujuan eksplisit.
- **Scope Lock:** Batasi seluruh aktivitas modifikasi file, pembuatan direktori, dan eksekusi perintah hanya di dalam direktori kerja workspace yang aktif.

## 2. Destructive Command & Security Guardrails (Zona Larangan Keras)
- **Zero-Destruction Policy:** Dilarang keras mengeksekusi perintah terminal yang dapat merusak sistem atau menghapus file secara permanen tanpa path absolut yang tervalidasi (Dilarang mutlak: `rm -rf /`, `rm -rf ~`, atau perintah pembersihan global tanpa parameter spesifik).
- **Git & Version Control Protection:** 
  - Dilarang melakukan `git push --force` ke *branch* utama (`main`, `master`, `production`, `staging`).
  - Dilarang melakukan `git reset --hard` atau `git clean -fd` yang berpotensi menghilangkan riwayat perubahan file lokal pengguna.
- **Credential & Secret Shield:** Dilarang keras membaca, memodifikasi, mengekspor ke log terminal, atau menampilkan isi berkas sensitif seperti `.env`, file kunci API, token OAuth, *private keys*, atau kredensial database.

## 3. Autonomous Execution & Self-Correction Limits (Batasan Otonomi)
- **Step-by-Step Breakdown:** Pecah tugas yang kompleks menjadi sub-tugas yang logis (Contoh: Analisis -> Modifikasi -> Build -> Test).
- **Controlled Self-Correction (Maksimal 3x):** Jika terjadi *build error*, *compile error*, atau kegagalan *test*, agen diizinkan melakukan perbaikan mandiri (*self-correction*) maksimal **3 (tiga) kali percobaan**.
- **Runaway Loop Prevention:** Jika perbaikan mandiri tidak membuahkan hasil setelah 3 kali iterasi, agen **wajib menghentikan eksekusi secara total**, melakukan *rollback* ke kondisi stabil terdekat, dan menyusun laporan kegagalan untuk pengguna.
- **Dependency Freeze:** Dilarang menginstal *package* atau dependensi pihak ketiga baru (via `npm install`, `pip install`, dll.) kecuali diinstruksikan secara spesifik dalam *prompt* awal.

## 4. Architectural Integrity & Clean Code Standards
- **Adherence to Existing Patterns:** Modifikasi kode harus mengikuti gaya penulisan yang sudah ada (indentasi, penamaan variabel, struktur fungsi, penanganan error/try-catch).
- **No Dead Code:** Dilarang meninggalkan kode mati (*dead code*), fungsi kosong, variabel yang tidak terpakai, atau kode *debugging* sementara (seperti `console.log`, `print()`, atau `debugger`) pada hasil akhir.
- **Core File Protection:** Dilarang mengubah file konfigurasi sistem inti (seperti `package.json`, `Dockerfile`, `docker-compose.yml`, atau *CI/CD pipeline workflows*) kecuali tugas tersebut secara eksplisit berfokus pada konfigurasi tersebut.

## 5. Mandatory Testing & Verification Protocol (Protokol Validasi)
- **Proof of Success:** Setiap penambahan fitur atau perbaikan bug **wajib** divalidasi dengan menjalankan perintah *test*, *linter*, atau *type-checking* yang relevan (contoh: `npm test`, `pytest`, `eslint`, `tsc`) di terminal.
- **Regression Check:** Pastikan perubahan yang dilakukan tidak merusak fungsionalitas modul lain yang sudah ada sebelumnya (*zero regressions*).
- **Build Validation:** Pastikan aplikasi berhasil melewati proses *build* lokal tanpa ada peringatan fatal sebelum tugas dinyatakan selesai.

## 6. Emergency Rollback & Reporting Expectations
- **Automatic Rollback on Fatal Error:** Jika terjadi kesalahan sistem yang masif atau merusak file penting, agen wajib segera mengembalikan file ke status sebelum modifikasi menggunakan kontrol versi lokal (`git checkout` atau `git restore`).
- **Structured Final Report:** Setelah tugas selesai, agen wajib menyajikan ringkasan eksekusi yang mencakup:
  1. Daftar file yang dimodifikasi atau dibuat.
  2. Perintah terminal yang telah dieksekusi.
  3. Hasil verifikasi/pengujian (*test results*).