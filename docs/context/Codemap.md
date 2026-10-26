# Trackster — Codemap (mau ubah X, buka di mana)

Snapshot 2026-10-05 (diperbarui 2026-10-17). Kalau nambah module/route/cron, update file ini.

## Invest — tambahan lokal 2026-10-26

- Kelanjutan I3/I4: `invest-review.ts` menghitung diff, drift Decimal5pp, rollover WIB dan reviewKey; `invest-market.service.ts/controller.ts` menambah compare/filter/reviews/ack. Acknowledgment memakai audit `InvestChange`, tidak masuk portfolio revision. Tidak ada migrasi baru.
- UI: `InstrumentDetails.tsx`, `/app/market/[id]`, `/app/market/compare` dan `InvestReviews.tsx` pada arsip/detail evaluasi. QA tambahan `invest-review.check.ts`, `scripts/invest-review-e2e.mjs`, alur detail/filter/compare/ack pada `market-browser-check.mjs`. Baca `docs/invest/09-Review-Research.md`.

- I3: `invest-engine.ts` (gate, M3–M6, peer/top3, lot/biaya dan full-pot stress), `invest-catalog.ts` (tiga catatan nyata research-only), `invest-market.service.ts/controller.ts/dto.ts` (versi metadata, akses privat, mapping, snapshot, pilihan kandidat dan reserve→settle). `invest-payload.guard.ts` memvalidasi raw DTO sebelum global pipe lama menghapus unknown fields.
- Migrasi `20261026140000_invest_market_evaluation`: catalog bersama `InvestInstrument`; actor audit `InvestCatalogRevision`, akses `InvestInstrumentAccess` dan arsip `InvestEvaluation` berscope user. Tambahan mapping holding + plan/settledLedgerIds reservasi, tanpa perubahan tabel keuangan lama.
- UI I3: `InvestMarket.tsx`, `InvestEvaluation.tsx`, `lib/market.ts`; Pasar/Sumber, panel Rencana, `/app/reviews` dan `/app/reviews/[id]`. UI sumber memakai metadata manual; tidak ada harga sintetis produksi. QA: `invest-engine.check.ts`, `scripts/invest-market-e2e.mjs`, `apps/invest/scripts/market-browser-check.mjs`.

- Inti I2: `invest-portfolio.service.ts/controller.ts/dto.ts` (tujuan, versi profil, holdings/ledger, koreksi, idempotency dan pembatalan reservasi), `invest-profile.ts` (M2), `invest-accounting.ts` (jatah/kas/credit), Decimal clone presisi60 di `invest-budget.ts`.
- Migrasi `20261026110000_invest_profile_portfolio`: tujuh tabel tenant baru + watermark ledger di InvestMonth, FK komposit user, unique parsial satu goal aktif, TTL reservasi maksimum24jam. Create/settle kini diekspos lewat market controller, wajib evaluation ACTUAL valid.
- Frontend `GoalsAndRisk.tsx`/`Portfolio.tsx`/`InvestForms.tsx`: wizard, hasil T/C/H, input/pergerakan manual, koreksi, retry key, dialog v3. API daftar baru `/invest/portfolio`, `/goals`, `/holdings`, `/ledger`, `/reservations`; POST/PATCH/PUT sesuai PRD. Tidak ada perubahan route keuangan lama.
- QA tambahan: `invest-profile.check.ts`, `invest-accounting.check.ts`, `scripts/invest-portfolio-e2e.mjs`, `apps/invest/scripts/portfolio-browser-check.mjs`.

- `apps/invest`: frontend Next/SWR terpisah. Shell/auth/CSS/mascot/API dari source frontend Trackster; token `DARK/LIGHT/DENSITY` bersama di `apps/frontend/src/components/v3/tokens.ts`.
- `modules/invest`: `/invest/status`, `/invest/budget`, `/invest/payment-events`, `PUT /invest/cash-confirmation`, `PATCH /invest/payment-events/:eventKey`. Guard JWT + allowlist user eksplisit; tidak ada cron/provider/pembelian.
- `invest-budget.ts`: kalender/estimasi bulanan, actual/forecast20%, gate input/reconciliation/cash. `invest.service.ts`: source fingerprint, Serializable writes, links/audit per user. Income/BankBalance/DailyBudget tidak ditulis.
- `InvestMonth`, `InvestPaymentEvent`, `InvestReceiptLink`, `InvestEventAudit`: migrasi aditif `20261026090000_invest_monthly_foundation`.
- `common/csrf.ts#frontendOrigins`: CORS/CSRF satu allowlist dari `FRONTEND_URL` + `INVEST_FRONTEND_URL` opsional. `INVEST_ENABLED` + `INVEST_USER_IDS` default deny.
- Handoff, command dan bukti: `docs/invest/06-Implementation.md`, `apps/invest/README.md`; tes `scripts/invest-e2e.mjs` dan `apps/invest/scripts/browser-check.mjs`.

## Backend — `apps/backend/src/modules/`

| Module | Route prefix | Isi penting |
| --- | --- | --- |
| auth | `/auth` | login/logout/me, cookie `trackster_jwt`. Guard: `common/guards/jwt-auth.guard.ts`, dipasang per controller (nggak ada global guard). |
| gmail | `/gmail` | OAuth (scope gmail.readonly + calendar.events), `gmail-sync.service.ts` cron 5 menit, query `from:(bca OR jago OR flip)`. |
| gmail/parsers | — | `parser-registry` urutan **Flip → BCA → Jago**. Helper: `parser.interface.ts` (`extractField`, `parseEmailDate` WIB, `parseRupiah`), `own-accounts.ts` (deteksi rekening sendiri, termasuk nomor ter-mask). |
| sync | `/sync` | trigger manual, backfill rentang tanggal (default tanpa notif Telegram), next-run, logs. |
| transaction | `/transactions` | list+filter, weekly/monthly/summary/day/insights, create manual, note/category/alias. `createFromParsed()` = jalur sync. `getInsights()` = sumber data semua fitur analitik/AI. |
| balance | `/balance` | saldo per source, koreksi manual, histori adjustment. `adjustBalance(tx, source, delta)` wajib di dalam `$transaction`. |
| budget | `/budget` | budget per hari, `today` summary, `runway`, `settings` (mode FIXED/CYCLE/BALANCE), `allowances` (snapshot jatah per tanggal). Engine siklus gajian murni di `budget-cycle.ts` (docs/siklus-gajian.md). |
| income | `/income` | CRUD + `allowance-suggestion` + `allocation`. |
| income-stream | `/income-streams` | CRUD sumber pemasukan; `GET suggestions` (`stream-detect.ts`, uang masuk rutin tanpa sumber); `POST {linkPast:true}` menautkan riwayat yang cocok keyword. |
| merchant-alias | `/merchant-aliases` | CRUD alias. |
| goal | `/goal` | Kantong: create, contribute, archive, simulate (what-if). |
| subscription | `/subscriptions`, `/calendar` | CRUD + sync event Google Calendar (`googleCalendarEventId`). Jatuh tempo basi digulir otomatis (`subscription-due.ts`, dipakai juga komitmen budget/advisor). `GET suggestions` = deteksi tagihan bulanan berulang (`recurring-detect.ts`). `GET calendar-link` → feed publik `GET /calendar/<userId>-<sig>.ics` (HMAC userId+tokenVersion, `subscription-ics.ts`). |
| telegram | `/telegram` | config/test (JWT) + `POST /telegram/webhook/:secret` (public; cek secret + chatId). Tanpa AI: catat cepat `kopi 25rb [bank] [kemarin]`, `+gaji 5jt` (pemasukan), `/hariini`, `/bisa <nominal>` (`budget/affordability.ts`, juga tool AI `checkAffordability`), `/pagi` (ringkasan 07:00 opt-in) — parser `telegram/quick-log.ts`, eksekusi `ingest/telegram-quick.service.ts` (lewat IngestService, kunci `tg:<chat>:<msg>`, tombol Batalkan `qx:<id>`). |
| ai | `/ai` | `chat`, `mascot-tip`, health-score history, trigger manual laporan. |
| split-bill | `/split-bills` | privat (JWT) + `public`, `manage/:ownerToken`, `public/:slug`. Scan struk: `split-bill-ai.service.ts`. Bill akun bisa ditautkan ke 1 transaksi (`transactionId`): peserta selain yang pertama (= pembuat) jadi `Reimbursement` tertaut (`splitParticipantId`), disinkronkan `syncLinked()` setelah create/assign/tandai lunas; patungan tertaut hanya mengurangi `reimbursedAmount`, tidak menggerakkan saldo. |

### AI internals (`modules/ai/`)
- `ai.service.ts` — client OpenAI-compat/Anthropic-style + `runToolLoop()`. Env: `AI_BASE_URL`,
  `AI_API_KEY`, `AI_AUTH_HEADER` (default `x-bf-vk`), `AI_MODEL`; fallback ke `SPLITBILL_AI_*`.
- `ai-finance-tools.service.ts` — tools: getTodaySummary, getWeeklySummary, getInsights,
  getMonthlySummary, getAllTimeSummary, getIncomeAllocation, logExpense. Tool baru = reuse service
  yang ada, jangan query Prisma manual.
- `ai-chat.service.ts` — chat handler + `categorize()` (dipanggil dari sync).
- `ai-reports.service.ts` — cron weekly & monthly + `computeAndSaveHealthScore()`.
- `ai-mascot.service.ts` — tip mascot.

### Cron (semua `@nestjs/schedule`)
| Jadwal | Job |
| --- | --- |
| tiap 5 menit | Gmail sync → parse → kategori AI → simpan + adjust saldo → cek budget → alert |
| Minggu 20:00 WIB | Weekly insight ke Telegram + simpan Health Score |
| Minggu 21:00 WIB | Alokasi 50/30/20 → timpa `DailyBudget` (dilewati untuk mode CYCLE/BALANCE) |
| tiap hari 00:05 WIB | Snapshot `DailyAllowance` untuk user mode CYCLE/BALANCE |
| tiap hari 07:00 WIB | Ringkasan pagi Telegram (hanya `dailyBrief` = true, lewat `/pagi`) |
| tiap hari 20:00 WIB (eksekusi cuma di hari terakhir bulan) | Monthly report card ke Telegram |

## Frontend — `apps/frontend/src/`

UI = **Trackster v3** (redesign 1:1 dari `docs/Rework Design Trackster/Trackster v3 App.dc.html`). Satu komponen host merender
semua layar; route cuma menentukan layar mana yang aktif.

| Route | Isi |
| --- | --- |
| `/`, `/login`, `/setup` | Landing, masuk, wizard setup (nyata) — layar `pre` prototipe |
| `/app`, `/app/today`, `/app/weekly` | Beranda, Hari ini, Mingguan (7 hari terakhir) |
| `/app/budget`, `/app/income`, `/app/income/checkin`, `/app/goals`, `/app/subscriptions` | Rencana |
| `/app/reports`, `/app/insights`, `/app/chat`, `/app/chat/memory`, `/app/categorize` | Insight (insights = Analisis) |
| `/app/more`, `/app/split`, `/app/calc`, `/app/sources`, `/app/privacy`, `/app/settings` | Menu |
| `/demo/*` | Prototipe dengan data contoh (tombol "Coba pakai data contoh" di landing) |
| `(public)`: `/split-bills/new`, `/split-bills/manage/[token]`, `/s/[slug]`, `/t/[slug]`, `/trip/*`, `/tools`, `/savings-calculator`, `/installment-calculator`, `/invite/[code]`, `/reset/[token]` | Tools publik & alur akun (Tailwind). `/split-bills`, `/split-bills/:id` → redirect `/app/split` (`next.config.js`) |
| `(legal)`: `/privacy`, `/terms` | Halaman legal |

Tiga root layout: `app/(v3)/layout.tsx` (tanpa `globals.css`/Tailwind preflight — desain v3 bergantung pada default browser),
`app/(public)/layout.tsx` (Tailwind, tools publik) dan `app/(legal)/layout.tsx`.

**Cara kerja v3 (`components/v3/`)**
- `views/*View.tsx`, `V3Tree.tsx`, `pseudo.css` — **digenerate** oleh `scripts/dc-to-tsx.mjs` dari template `.dc.html`. Jangan edit tangan;
  ubah generator atau sumber desain lalu jalankan `node scripts/dc-to-tsx.mjs` (dari `apps/frontend`). Teks contoh yang tertulis di markup
  prototipe diganti kunci view-model `*Txt` lewat tabel `LITERALS` di generator.
- `logic.tsx` — logika prototipe (state, `rv_*`, kamus EN `v3tr()`) dibawa utuh dan **dirawat tangan**; di tempat yang menyentuh data ada cabang
  `this.props.live !== undefined` (mode nyata) vs prototipe (`/demo`).
- `live/useLive.ts` — SWR ke backend → bentuk state prototipe (`flat`, `st`, `chat`, `split`) + `actions` tulis. `live/map.ts`, `live/reports.ts`,
  `live/dates.ts` (tanggal WIB). `V3Host.tsx` — pathname ↔ `page`/`pre` (`lib/v3-routes.ts`), tema/bahasa di localStorage.
- Data: `lib/api.ts` (fetcher, auto-redirect `/login` on 401) + SWR. Auth redirect: `middleware.ts` (`/demo` & `/setup` publik).
- Pemeriksaan fidelitas: bandingkan DOM/geometri dengan `Trackster v3 App (standalone).html` (lihat `docs/Rework Design Trackster/PLAN.md`).
- Responsif ponsel: kelas helper di `v3/v3.css` (`v3-ph`, `v3-nph`, `v3-wrap`, `v3-minw0`, `v3-col`, `v3-tight`; batas 719px = bp `'m'`), dipasang
  lewat `class="…"` di `.dc.html`. Temuan & konvensi: `docs/ui-ux-audit-2026-10-10.md`.

**Motion landing & publik (2026-10-08)** — `v3/LandingMotion.tsx` + `v3/landing-motion.css` (dipasang `V3Host` hanya di `/`; reveal scroll,
tilt hero, sorotan kursor; semua gaya di bawah `html[data-lpm]`, menempel ke `data-sec`/`data-rv` markup generator). Publik: `(public)/pub-motion.css`
(CSS saja). Rollback: `docs/landing-motion-ROLLBACK.md`.

**Logo (SVG)** — `MerchantAlias.icon` + tabel `CategoryIcon` (endpoint di `merchant-aliases`: `PUT /icon`, `GET|PUT /category-icons`).
Nilai = path relatif di `apps/frontend/public/icons/` (mis. `indonesia/bca.svg`). Katalog dibuat `node scripts/build-icons.mjs`
(sumber `<repo>/svg`, skip `undraw_*` & file >100KB) → `src/lib/icon-catalog.ts`; render `src/lib/icons.ts` (`iconCss`), picker `v3/IconPicker.tsx`.
Logo tetap (tak bisa diubah user: BCA/Jago/Flip, Gmail, Calendar, Telegram) = `brandCss()` di `lib/icons.ts`.
Dipakai di baris Hari ini, detail transaksi, Setting → Alias merchant (+ logo kategori). Tambah logo baru = taruh di `svg/`, jalankan skrip.

## Dokumen lain di repo
- `TRACKSTER_BUILD_PLAN.md` — plan MVP awal + **contoh format email asli** BCA/Jago (rujukan parser).
- `TRACKSTER_AI_FEATURES_PLAN.md` — konvensi AI (tool-calling, cron, reuse helper). Status: selesai.
- `design_system/` — token, guideline, `handoff/README.md`.

## Drift yang ketemu (belum dibenerin)
- ~~`.env.example` domain lama / env belum lengkap~~ — dirapikan 2026-10-06 (multi-user F0).
- `Source.GOPAY` masih di enum & tipe frontend walau nggak ada sumber aktif.

## Keamanan (audit 2026-10-10, `docs/multi-user/09-Security-Audit.md`)
- `common/guards/ai-rate-limit.guard.ts` — kuota AI: `AiRateLimitGuard` (per user per rute) & `aiUserQuotaOk()` (chat 50/hari) menghitung harian di tabel `AiUsage` (bertahan deploy) + burst per menit in-memory; `aiQuotaOk()` in-memory hanya untuk kunci tanpa user (scan struk per IP, webhook Telegram). Endpoint baru yang memanggil AI WAJIB memasang guard ini.
- `telegram.service.ts`: `escHtml()` wajib untuk teks dinamis di pesan Telegram (parse_mode HTML); Bot API lewat `tgCall()` (fetch, tanpa library). Chat ID manual hanya pemilik; member via `POST /telegram/link-code` + `/start <kode>`.
- `main.ts`: query parser `simple`, header keamanan API. `next.config.js`: header keamanan frontend. Tes serangan: `scripts/security-e2e.mjs`.

## Multi-user — F6 (live di prod)
- `modules/api-token` (`/api-tokens`, JWT): buat/daftar/cabut token API per user (`trk_`+40 base62, hash SHA-256, maks 5 aktif). `common/guards/api-token.guard.ts` = Bearer → `req.apiAuth{userId,tokenId}` (user harus ACTIVE, rate limit 60/mnt/token, env tes `INGEST_RATE_LIMIT`).
- `modules/ingest` (`POST /ingest/transaction|income`): pintu Shortcut; `Idempotency-Key` → `emailId`/`externalId = ing:<key>` (dedup per user). Income memakai `IncomeService.createQuick(userId, dto, {externalId, receivedAt, streamId})`.
- Frontend: tab **Shortcut** di `/app/settings` (sumber di `.dc.html` + `logic.tsx` batch3 `setTok…` + `useLive` `tokens`/`tokCreate`/`tokRevoke`). `/income/quick` lama sudah dihapus (P6-06).
- Tes: `scripts/ingest-e2e.mjs` (backend jalan dgn `INGEST_RATE_LIMIT=30`), `api-token.util.check.ts`, `ingest.util.check.ts`.

## Multi-user (live di prod sejak 2026-10-13)
- Skema: `User` + role/status/displayName/fullName/tokenVersion; semua tabel tenant punya `userId` wajib (FK Restrict) dan unik komposit `(userId, …)` (C1 selesai). Tabel: `Invite, OneTimeToken, ApiToken, InboundAddress, OwnAccount, TelegramLink(+Code), AiUsage`.
- Alat (di `apps/backend`): `npm run check` (semua `*.check.ts`), `npm run tenancy-audit` (daftar kerja scoping), `npm run golden`/`isolation-e2e` (`scripts/`), `prisma/data-fixes/{verify-backfill,2026-10-multiuser-backfill-owner}.js`, `prisma/provision-user.js`. Detail & status: `docs/multi-user/08-Progress-Log.md`.
- **F2 (scoping backend, di branch):** semua service tenant menerima `userId` sebagai parameter pertama; controller memakai `@CurrentUser()` (`common/decorators/current-user.decorator.ts`). Cron per user lewat `common/per-user.ts#forEachActiveUser`; jalur legacy tanpa konteks user (`/income/quick`, Gmail/`/sync/*`) memakai/mengunci ke pemilik (`common/owner.ts`). Sisa `findFirst`+`update/create` dari masa sebelum C1 masih benar (unik sudah komposit), boleh diganti upsert bila disentuh.


## Inbound email (F7, live — pemilik masih `shadow`)
- `modules/gmail/email-pipeline.service.ts` — pipeline email->parse->saldo/kategori/Telegram, dipakai Gmail sync DAN inbound (opsi `shadow` = log `ParseStatus.SHADOW`, tanpa tulis data). Email bank yang tak terbaca parser dan tidak `looksTransactional()` (promo/info) → `EXCLUDED`, bukan `UNPARSED` (PR #16).
- `modules/inbound/` — `POST /ingest/email` (HMAC `X-Trackster-Signature` = HMAC(secret, `ts.to.sha256(body)`) — `to` = header `X-Trackster-To`, ts ms ±5 mnt, body MIME mentah via `express.raw` di `main.ts`, maks 3MB). Alamat `u+<24 char base32>@in.trackster.dev` -> `InboundAddress`. Bukan pengirim bank (`ParserRegistryService.canHandle`) = dibuang. Email konfirmasi Gmail -> `lastForwardCode`.
- CLI: `node prisma/user-admin.js inbound --username u [--shadow on|off] [--rotate]`. Tes: `inbound.util.check.ts`, `scripts/inbound-e2e.mjs`.

## Profil & onboarding (P8, live)
- `modules/profile/` — `GET /profile` (nama, nama di rekening, `OwnAccount`, bank = baris `BankBalance`, alamat inbound dibuat malas — shadow bila user punya `GmailToken`, hasil email forward terakhir, checklist aktivasi), `PATCH /profile` (termasuk `forwarding: boolean` = `InboundAddress.isActive`; dipakai wizard "Catat sendiri" & tombol Jeda di Sumber data, PR #15), `PUT /profile/accounts` (ganti semua), `POST /profile/banks` (tambah saja), `POST /profile/onboarded`.
- Frontend: `useLive` memuat `/profile` (poll 4 dtk di `/setup`); `V3Host` mengarahkan akun baru (belum onboarded & tanpa transaksi) ke `/setup`; wizard live di `logic.tsx#rv_pre` (langkah diturunkan dari data server). `/setup` tidak lagi publik (`middleware.ts`).
- Setting → Koneksi: baris Email bank + Nama & rekening (semua user); kartu Gmail & Calendar hanya pemilik (`live.isAdmin`).
- Worker Cloudflare: `infra/cloudflare-worker/` (`wrangler.toml`, secret `INGEST_HMAC_SECRET`). Uji email asli tanpa DNS: `apps/backend/scripts/send-eml.mjs`.

## Perbaikan 2026-10-17 (sudah di `main`)
- Kategori otomatis: rule merchant → hint parser → **riwayat merchantKey yang sama** (`MerchantAliasService.findCategoryFromHistory`) → AI.
- Indeks komposit `(userId, occurredAt)` / `(userId, receivedAt)` di Transaction, Income, EmailParseLog.
- Frontend: `app/manifest.ts` + `public/pwa-*.png` (PWA bisa dipasang); `lib/api.ts` GET tanpa `Content-Type` (tanpa preflight CORS),
  backend CORS `maxAge` 2 jam; `useLive` memuat token API / riwayat koreksi saldo / thread & memori chat / saran langganan / tautan .ics
  hanya di layarnya (`on(prefix, key)`), fokus tab revalidasi maks 1×/menit, tip maskot di-cache 3 jam di backend.
- Ekspor CSV (`/reports/export.csv`): + pemasukan, jam, nama alias, patungan, BOM.

## Audit 2026-10-18 (`docs/multi-user/11-Audit-2026-10-18.md`)
- Saldo: `Transaction/Income.balanceApplied` — hapus/edit membalik saldo hanya kalau true; `BalanceService.correctBalance` menyerap semua baris source itu; `adjustAfterBaseline()` = aturan baseline + gerakkan saldo.
- `GmailSyncService.syncEmails` dikunci per user; email RECORDED tak diunduh ulang; `EmailSyncLog` > 30 hari dibuang.
- `useLive`: riwayat/forecast/check-in pemasukan, target, rapikan kategori dimuat hanya di layarnya (Beranda 27 → 21 request).
