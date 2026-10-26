import type { InvestEvaluation } from '@prisma/client';
import { InvestDecimal as D } from './invest-budget';
import type { EngineInput, evaluateInvest } from './invest-engine';
import { snapshotHash } from './invest-review';

export const EXPLANATION_VERSION = 'invest-explanation-v0.1';
export type Language = 'id' | 'en';
type Copy = [string, string];
type Result = ReturnType<typeof evaluateInvest>;
export type Selection = { claimId: string; variant: 'brief' | 'detail'; sourceIds: string[] };
export type ExplanationSelection = { version: string; blocks: Selection[] };
type Fact = { label: string; value: string | null; format: 'money' | 'text' | 'percent'; path: string };
type Claim = { id: string; title: string; brief: string; detail: string; facts: Fact[]; sourceIds: string[] };
type Source = { id: string; instrumentId: string; instrumentVersion: number; title: string; url: string; section: string; observedAt: string; fetchedAt: string };
const ASSET_NAMES: Copy[] = [['Kas tujuan', 'Goal cash'], ['Pendapatan tetap', 'Fixed income'], ['Ekuitas', 'Equity'], ['Crypto', 'Crypto']];

/** Every sentence is grounded by server predicates. Free-form catalog/user text never enters the model packet. */
export function explanationEvidence(e: InvestEvaluation, language: Language) {
  const tr = (x: Copy) => x[language === 'id' ? 0 : 1];
  const input = e.input as unknown as { engine: string; input: EngineInput }, r = e.result as unknown as Result;
  const claims: Claim[] = [], sources: Source[] = [];
  const add = (id: string, title: Copy, brief: Copy, detail: Copy, facts: Fact[] = [], sourceIds: string[] = []) => claims.push({ id, title: tr(title), brief: tr(brief), detail: tr(detail), facts, sourceIds });
  const fact = (label: Copy, value: string | null, format: Fact['format'], path: string): Fact => ({ label: tr(label), value, format, path });
  const supported = input.engine === 'invest-engine-v0.1.0' && e.ruleset === 'invest-method-v0.1';
  if (!supported) {
    add('unsupported', ['Versi arsip', 'Archive version'], ['Versi perhitungan ini belum didukung oleh penjelasan.', 'This calculation version is not supported by the explanation.'], ['Baca angka dan bukti pada arsip; buat evaluasi baru dengan metode saat ini sebelum mengambil keputusan.', 'Read the archived figures and evidence; create an evaluation with the current method before making a decision.']);
  } else {
    const status: Record<string, [Copy, Copy]> = {
      READY: [['Usulan lolos pemeriksaan pada saat evaluasi.', 'The proposal passed checks at evaluation time.'], ['Nominal sudah melewati pemeriksaan data, akses, biaya, dan skenario risiko saat evaluasi. Tinjau bukti dan kondisi terkini sebelum mencatat pembelian manual.', 'Amounts passed data, access, cost, and risk scenario checks at evaluation time. Review the evidence and current conditions before recording a manual purchase.']],
      PARTIAL: [['Hanya sebagian kelompok memiliki kandidat yang layak.', 'Only some asset classes have eligible candidates.'], ['Sebagian kelompok belum memiliki kandidat atau pilihan eksposur yang memadai. Dana yang tidak teralokasi tetap menjadi sisa kas; periksa alasan penahanan.', 'Some asset classes lack suitable candidates or an exposure selection. Unallocated funds remain residual cash; review the withholding reasons.']],
      WITHHELD: [['Usulan pembelian ditahan oleh pemeriksaan.', 'The proposal is withheld by the checks.'], ['Profil, data, akses, kebutuhan dana, atau risiko belum memenuhi aturan. Adanya skor atau target dalam arsip tidak membuka pembelian; lengkapi alasan penahanan dan evaluasi ulang.', 'Profile, data, access, funding needs, or risk do not meet the rules. Scores or targets in the archive do not enable purchases; resolve the withholding reasons and evaluate again.']],
      PLAN_ONLY: [['Ini simulasi berdasarkan jatah rencana.', 'This is a simulation based on the planned allowance.'], ['Forecast dipakai hanya untuk merencanakan. Simulasi ini tidak dapat mereservasi jatah atau menjadi bukti pemasukan yang sudah diterima.', 'Forecast is used only for planning. This simulation cannot reserve an allowance or serve as evidence of received income.']],
      CASH_ONLY: [['Metode menempatkan kontribusi ini dalam kas.', 'The method keeps this contribution in cash.'], ['Kelas risiko pada evaluasi ini memakai kas. Tidak ada usulan pembelian instrumen; pemisahan kas tujuan dicatat hanya setelah benar-benar dilakukan.', 'The risk class for this evaluation uses cash. There is no proposed instrument purchase; goal cash is recorded only after it has actually been set aside.']],
    };
    const statusCopy = status[r.status] ?? status.WITHHELD;
    add('status', ['Mengapa hasil ini muncul', 'Why this result appears'], ...statusCopy);
    add('budget', ['Dasar nominal', 'Amount basis'],
      e.mode === 'PLAN' ? ['Jatah rencana terpisah dari dana aktual.', 'The planned allowance is separate from actual funds.'] : ['Kontribusi dibatasi jatah aktual dan kas bebas terkonfirmasi.', 'The contribution is capped by the actual allowance and confirmed free cash.'],
      e.mode === 'PLAN' ? ['Rencana memakai forecast bulanan setelah pemakaian dan reservasi. Jangan menjumlahkannya dengan jatah aktual. Nilai yang belum diketahui tetap kosong.', 'Planning uses the monthly forecast after usage and reservations. Do not add it to the actual allowance. Unknown values remain empty.'] : ['Dasarnya bagian investasi dari pemasukan bulanan yang sudah diterima, setelah pemakaian, kas tujuan, dan reservasi. Kas bebas terkonfirmasi membatasi dana yang bisa dialokasikan.', 'The basis is the investment share of received monthly income, after usage, goal cash, and reservations. Confirmed free cash caps the amount available for allocation.'],
      [fact(['Kontribusi pada evaluasi', 'Evaluation contribution'], r.budgetIDR, 'money', 'result.budgetIDR'), fact(['Sisa kas pada evaluasi', 'Evaluation residual cash'], r.residualCashIDR, 'money', 'result.residualCashIDR')]);
    if (r.targets.length === 4) add('allocation', ['Pembagian pot tujuan', 'Goal pot allocation'], ['Dana baru mengisi kekurangan terhadap target pot.', 'New funds fill gaps against the pot targets.'], ['Target mempertimbangkan seluruh kepemilikan dan kas tujuan. Batas toleransi dan kapasitas kerugian dapat mengecilkan porsi aset berisiko; kelebihan aset lama tidak dijual otomatis.', 'Targets consider all holdings and goal cash. Loss tolerance and capacity may reduce risky-asset weights; existing overweight holdings are not sold automatically.'], r.targets.map((v, n) => fact(ASSET_NAMES[n], new D(v).times(100).toFixed(4), 'percent', `result.targets.${n}`)));
    if (r.stress) add('stress', ['Pemeriksaan skenario', 'Scenario check'],
      r.stress.passed ? ['Pot lolos skenario metode pada snapshot ini.', 'The pot passes the method scenarios in this snapshot.'] : ['Pot belum lolos batas skenario metode.', 'The pot does not pass the method scenario limits.'],
      ['Skenario menghitung kepemilikan, kontribusi, biaya, dan batas crypto. Ini uji tekanan dengan asumsi metode, bukan ramalan atau batas kerugian pasar yang dijamin.', 'Scenarios include holdings, the contribution, costs, and the crypto limit. This stress test uses method assumptions; it is neither a forecast nor a guaranteed ceiling on market losses.'],
      [fact(['Kerugian terbesar dalam skenario', 'Largest scenario loss'], r.stress.worstLossIDR, 'money', 'result.stress.worstLossIDR'), fact(['Batas kerugian profil', 'Profile loss limit'], r.stress.limitIDR, 'money', 'result.stress.limitIDR')]);
    add('ranking', ['Cara membaca shortlist', 'How to read the shortlist'], ['Urutan hanya berlaku di dalam kelompok yang sebanding.', 'Ranking only applies within comparable peer groups.'], ['Skor mempertimbangkan biaya, diversifikasi, kualitas data, likuiditas, dan akses. Kandidat beda eksposur tidak diurutkan bersama. Selisih skor kecil tidak membuktikan keunggulan return.', 'Scores consider cost, diversification, data quality, liquidity, and access. Candidates with different exposures are not ranked together. Small score differences do not prove superior returns.']);
    // Explain only the selected peers (at most three); the complete shortlist remains in the immutable result.
    for (const [n, order] of r.orders.entries()) {
      const group = r.groups.find(g => g.peer === order.peer), instrument = input.input.instruments.find(i => i.id === order.instrumentId);
      const ids: string[] = [];
      for (const source of instrument?.facts.sources ?? []) {
        if (source.rights !== 'PERMITTED' || !source.store || !source.display || !source.analyze) continue;
        try { const url = new URL(source.url); if (url.protocol !== 'https:' || url.username || url.password) continue; } catch { continue; }
        const id = `source_${sources.length + 1}`;
        sources.push({ id, instrumentId: order.instrumentId, instrumentVersion: instrument!.version, title: source.title, url: source.url, section: source.section, observedAt: source.observedAt, fetchedAt: source.fetchedAt }); ids.push(id);
      }
      const candidateIndex = group?.candidates.findIndex(c => c.instrumentId === order.instrumentId) ?? -1;
      const selected = group?.candidates[candidateIndex];
      add(`candidate_${n}`, ['Kandidat dalam usulan', 'Candidate in the proposal'], ['Kandidat mengikuti pilihan eksposur dan hasil evaluasi.', 'The candidate follows the exposure selection and evaluation result.'],
        selected?.nearTie ? ['Skor kandidat ini berdekatan dengan alternatif dalam kelompok yang sama. Bandingkan biaya dan akses; pilihan alternatif membutuhkan evaluasi baru.', 'This candidate has a similar score to an alternative in the same peer group. Compare costs and access; choosing an alternative requires a new evaluation.'] : ['Posisi di shortlist disimpan dari mesin evaluasi. Pilihan pengguna dapat berbeda dari posisi pertama; urutan dan skor arsip tetap dipertahankan.', 'The shortlist position is stored by the evaluation engine. The user selection may differ from the first position; the archived ordering and scores are preserved.'],
        [fact(['Instrumen', 'Instrument'], order.name, 'text', `result.orders.${n}.name`), fact(['Posisi dalam kelompok', 'Peer position'], candidateIndex < 0 ? null : String(candidateIndex + 1), 'text', `result.groups.${r.groups.indexOf(group!)}.candidates`), fact(['Skor', 'Score'], selected?.score ?? null, 'text', 'result.groups.candidates.score'), fact(['Nominal termasuk biaya beli', 'Amount including purchase costs'], order.totalIDR, 'money', `result.orders.${n}.totalIDR`), fact(['Biaya beli', 'Purchase costs'], order.feeIDR, 'money', `result.orders.${n}.feeIDR`)], ids);
    }
    const withheld = r.gates.filter(g => g.reasons.length).length;
    add('evidence', ['Data dan batas cakupan', 'Data and coverage limits'], ['Penjelasan mengikuti sumber dan pemeriksaan saat evaluasi.', 'The explanation follows sources and checks at evaluation time.'], ['Tautan di bawah hanya berasal dari snapshot dengan izin simpan, tampil, dan analisis. Data yang kurang atau kedaluwarsa tetap menjadi alasan penahanan. Shortlist mencakup catalog yang ditinjau, bukan seluruh pasar.', 'Links below come only from snapshot sources with storage, display, and analysis permissions. Missing or stale data remain withholding reasons. The shortlist covers the reviewed catalog, not the entire market.'], [fact(['Instrumen tertahan dalam catalog', 'Withheld catalog instruments'], String(withheld), 'text', 'result.gates')]);
    add('limits', ['Batas penjelasan', 'Explanation limits'], ['Penjelasan tidak memperbarui harga atau menggerakkan dana.', 'An explanation does not refresh prices or move funds.'], ['Semua angka berasal dari evaluasi tersimpan. Perubahan profil, data, atau kondisi dana memerlukan evaluasi baru. Penjelasan tidak menjanjikan hasil investasi dan tidak melewati pemeriksaan reservasi.', 'All figures come from the stored evaluation. Changes in profile, data, or funding conditions require a new evaluation. The explanation promises no investment outcome and cannot bypass reservation checks.']);
  }
  return { version: EXPLANATION_VERSION, evaluationId: e.id, evaluatedAt: e.createdAt.toISOString(), month: e.month, mode: e.mode, ruleset: e.ruleset, engine: input.engine, language, supported, claims, sources, reasons: supported ? r.reasons : ['EXPLANATION_VERSION_UNSUPPORTED'] };
}

export type ExplanationEvidence = ReturnType<typeof explanationEvidence>;
/** Allowlisted DTO, not a serialization of an evaluation. No identities, money, answers, names, URLs or source prose. */
export function explanationPacket(e: ExplanationEvidence) {
  return { version: e.version, language: e.language, mode: e.mode, blocks: e.claims.map(c => ({ claimId: c.id, variants: { brief: c.brief, detail: c.detail }, sourceIds: c.sourceIds })) };
}

const exact = (value: unknown, keys: string[]): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join('|') === [...keys].sort().join('|');
/** No free-text, numeric substitution, source substitution, omission, or reordering is accepted. */
export function validateExplanation(raw: string, e: ExplanationEvidence): ExplanationSelection | null {
  if (raw.length > 8192) return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (!exact(v, ['version', 'blocks']) || v.version !== e.version || !Array.isArray(v.blocks) || v.blocks.length !== e.claims.length) return null;
    for (let n = 0; n < v.blocks.length; n++) {
      const b = v.blocks[n], claim = e.claims[n];
      if (!exact(b, ['claimId', 'variant', 'sourceIds']) || b.claimId !== claim.id || !['brief', 'detail'].includes(b.variant as string) || !Array.isArray(b.sourceIds) || b.sourceIds.some(x => typeof x !== 'string') || JSON.stringify(b.sourceIds) !== JSON.stringify(claim.sourceIds)) return null;
    }
    return v as unknown as ExplanationSelection;
  } catch { return null; }
}

export function renderExplanation(e: ExplanationEvidence, selection: ExplanationSelection | null) {
  // Revalidate persisted selections too, so a version change cannot reuse unvalidated content.
  const valid = selection && validateExplanation(JSON.stringify(selection), e);
  const { claims, supported, ...document } = e;
  return { ...document, evidenceHash: snapshotHash(e), blocks: claims.map((c, n) => ({ id: c.id, title: c.title, text: valid?.blocks[n].variant === 'brief' ? c.brief : c.detail, facts: c.facts, sourceIds: c.sourceIds })) };
}
