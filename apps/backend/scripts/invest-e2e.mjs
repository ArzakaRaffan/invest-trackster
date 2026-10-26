// Synthetic, isolated Nest + PostgreSQL integration test. Never loads .env or starts cron/provider modules.
// First migrate a NEW database named invest_test_* on loopback. Set INVEST_TEST_DATABASE_URL explicitly.
// --serve keeps the synthetic API available for browser checks; Ctrl+C closes it. No real account data.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
const require = createRequire(import.meta.url);
const url = process.env.INVEST_TEST_DATABASE_URL;
if (!url) throw new Error('Set INVEST_TEST_DATABASE_URL to a fresh scratch database');
const parsed = new URL(url);
if (!['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname) || !/^\/invest_test_[a-z0-9_]+$/.test(parsed.pathname)) throw new Error('Refusing a non-loopback or non-invest_test_* database');
process.env.DATABASE_URL = url;
process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.AUTH_CACHE_MS = '0';
process.env.INVEST_ENABLED = 'true';
process.env.NODE_ENV = 'test';
delete process.env.COOKIE_DOMAIN;
require('reflect-metadata');
const { Module, ValidationPipe } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const cookieParser = require('cookie-parser');
const { PrismaModule } = require('../dist/prisma.module');
const { PrismaService } = require('../dist/prisma.service');
const { AuthModule } = require('../dist/modules/auth/auth.module');
const { InvestModule } = require('../dist/modules/invest/invest.module');
const { csrfOriginGuard, frontendOrigins } = require('../dist/common/csrf');
const { wibDateKey } = require('../dist/common/wib');
const bcrypt = require('bcrypt');
class TestModule {}
Module({ imports: [PrismaModule, AuthModule, InvestModule] })(TestModule);
const app = await NestFactory.create(TestModule, { logger: ['error'] });
const origins = frontendOrigins('http://localhost:3000', 'http://localhost:3001');
app.set('query parser', 'simple');
app.use(csrfOriginGuard(origins));
app.use(cookieParser());
app.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
app.enableCors({ origin: origins, credentials: true });
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
const port = Number(process.env.INVEST_TEST_PORT ?? 4000);
await app.listen(port, '127.0.0.1');
const prisma = app.get(PrismaService);
const apiBase = `http://127.0.0.1:${port}`;
const origin = 'http://localhost:3001';
let checks = 0;
function eq(actual, expected, label) { assert.deepEqual(actual, expected, label); checks++; }
async function request(path, { method = 'GET', cookie, body, requestOrigin = origin } = {}) {
  const res = await fetch(apiBase + path, { method, headers: { Origin: requestOrigin, ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json().catch(() => null), headers: res.headers };
}
async function login(username) {
  const result = await request('/auth/login', { method: 'POST', body: { username, password: 'synthetic-invest-only' } });
  eq(result.status, 201, 'shared Trackster login');
  assert.match(result.headers.get('set-cookie'), /HttpOnly/i); checks++;
  return result.headers.get('set-cookie').split(';')[0];
}
const month = wibDateKey(new Date()).slice(0, 7);
const path = `/invest/budget?month=${month}`;
let a, b, c, sa, sb, receiptA, cookieA, cookieB;
// Restart only the previously generated three-account synthetic fixture after a build.
if (process.argv.includes('--serve-existing')) {
  try {
    const users = await prisma.user.findMany({ select: { id: true, username: true } });
    assert.deepEqual(users.map(u => u.username).sort(), ['invest_test_a', 'invest_test_b', 'invest_test_denied']);
    process.env.INVEST_USER_IDS = users.filter(u => u.username !== 'invest_test_denied').map(u => u.id).join(',');
    console.log(`Existing synthetic test API ready on http://localhost:${port}; stop with Ctrl+C.`);
    await new Promise(resolve => { process.on('SIGINT', resolve); process.on('SIGTERM', resolve); });
  } finally { await app.close(); }
  process.exit(0);
}
try {
  eq(await prisma.user.count(), 0, 'use a NEW scratch database; never overwrite existing data');
  const password = await bcrypt.hash('synthetic-invest-only', 12);
  [a, b, c] = await Promise.all(['a', 'b', 'denied'].map(name => prisma.user.create({ data: { username: `invest_test_${name}`, password, role: name === 'a' ? 'ADMIN' : 'MEMBER' } })));
  process.env.INVEST_USER_IDS = `${a.id},${b.id}`;
  [sa, sb] = await Promise.all([a, b].map(user => prisma.incomeStream.create({ data: { userId: user.id, name: 'Synthetic monthly salary', kind: 'FIXED', cadence: 'MONTHLY', source: 'BCA', payDayOfMonth: 25, amount: '1000000.00', matchKeywords: [] } })));
  const receivedAt = new Date();
  receiptA = await prisma.income.create({ data: { userId: a.id, streamId: sa.id, amount: '625000.25', source: 'BCA', description: 'Synthetic partial payment A', receivedAt, status: 'CONFIRMED', balanceApplied: false } });
  const receiptB = await prisma.income.create({ data: { userId: b.id, streamId: sb.id, amount: '100002.13', source: 'BCA', description: 'Synthetic payment B', receivedAt, status: 'CONFIRMED', balanceApplied: false } });
  const pending = await prisma.income.create({ data: { userId: a.id, streamId: sa.id, amount: '100.03', source: 'BCA', description: 'Synthetic pending', receivedAt, status: 'PENDING', balanceApplied: false } });
  await prisma.income.create({ data: { userId: a.id, amount: '99000000.00', source: 'BCA', description: 'Synthetic internal', receivedAt, status: 'INTERNAL', balanceApplied: false } });
  await prisma.bankBalance.create({ data: { userId: a.id, source: 'BCA', balance: '987654.32' } });
  const legacy = async () => JSON.stringify(await Promise.all([prisma.income.findMany({ orderBy: { id: 'asc' } }), prisma.bankBalance.findMany({ orderBy: { id: 'asc' } }), prisma.dailyBudget.findMany({ orderBy: { id: 'asc' } })]));
  const before = await legacy();
  eq((await request(path)).status, 401, 'anonymous denied');
  cookieA = await login(a.username); cookieB = await login(b.username); const denied = await login(c.username);
  eq((await request('/invest/status', { cookie: denied })).status, 403, 'explicit account allowlist');
  const first = await request(path, { cookie: cookieA });
  eq(first.body.actualQuota, '125000.05', 'exact 20%, pending/internal excluded');
  eq(first.body.plannedQuota, null, 'unlinked receipt withholds forecast');
  eq(first.body.availableToAllocate, null, 'unknown cash is null');
  eq(first.headers.get('access-control-allow-origin'), origin, 'Invest CORS');
  eq((await request(path, { cookie: cookieA, requestOrigin: 'http://localhost:3000' })).headers.get('access-control-allow-origin'), 'http://localhost:3000', 'original Trackster CORS preserved');
  eq((await request(path, { cookie: cookieA, requestOrigin: 'https://evil.example' })).headers.get('access-control-allow-origin'), null, 'unlisted CORS origin not enabled');
  eq((await request('/invest/budget?month=2026-13', { cookie: cookieA })).status, 400, 'invalid month');
  const event = first.body.events[0];
  const update = { month, expectedRevision: first.body.revision, expectedVersion: event.version, status: 'PARTIAL', reason: 'Synthetic explicit reconciliation', incomeIds: [receiptA.id] };
  eq((await request(`/invest/payment-events/${event.eventKey}`, { method: 'PATCH', cookie: cookieB, body: update })).status, 404, 'cross-tenant event hidden');
  eq((await request(`/invest/payment-events/${event.eventKey}`, { method: 'PATCH', cookie: cookieA, body: { ...update, incomeIds: [receiptB.id] } })).status, 422, 'cross-tenant receipt rejected');
  eq((await request(`/invest/payment-events/${event.eventKey}`, { method: 'PATCH', cookie: cookieA, body: update, requestOrigin: 'https://evil.example' })).status, 403, 'mutation CSRF denied');
  const linked = await request(`/invest/payment-events/${event.eventKey}`, { method: 'PATCH', cookie: cookieA, body: update });
  eq(linked.status, 200, 'reconciliation works'); eq(linked.body.plannedQuota, '200000.00', 'partial receipt plus remaining event, counted once');
  eq((await request(`/invest/payment-events/${event.eventKey}`, { method: 'PATCH', cookie: cookieA, body: update })).status, 409, 'stale reconciliation rejected');
  const cash = { month, expectedRevision: linked.body.revision, amountIDR: '150000.00', confirmed: true };
  eq((await request('/invest/cash-confirmation', { method: 'PUT', cookie: cookieA, body: { ...cash, amountIDR: '-1' } })).status, 400, 'negative money rejected');
  eq((await request('/invest/cash-confirmation', { method: 'PUT', cookie: cookieA, body: { ...cash, amountIDR: 'NaN' } })).status, 400, 'NaN rejected');
  eq((await request('/invest/cash-confirmation', { method: 'PUT', cookie: cookieA, body: { ...cash, confirmed: false } })).status, 400, 'explicit confirmation required');
  const confirmed = await request('/invest/cash-confirmation', { method: 'PUT', cookie: cookieA, body: cash });
  eq(confirmed.status, 200, 'cash confirmed'); eq(confirmed.body.availableToAllocate, '125000.05', 'bounded by actual quota');
  eq((await request('/invest/cash-confirmation', { method: 'PUT', cookie: cookieA, body: cash })).status, 409, 'stale cash revision rejected');
  const race = await Promise.all(['100000.00', '110000.00'].map(amountIDR => request('/invest/cash-confirmation', { method: 'PUT', cookie: cookieA, body: { ...cash, amountIDR, expectedRevision: confirmed.body.revision } })));
  eq(race.map(r => r.status).sort(), [200, 409], 'concurrent writes cannot silently overwrite');
  const other = await request(path, { cookie: cookieB }); eq(other.body.actualQuota, '20000.43', 'other tenant quota'); eq(other.body.cashConfirmation, null, 'cash stays private');
  const eventB = other.body.events[0];
  const partB = await request(`/invest/payment-events/${eventB.eventKey}`, { method: 'PATCH', cookie: cookieB, body: { month, expectedRevision: other.body.revision, expectedVersion: 0, status: 'PARTIAL', reason: 'Synthetic partial before reschedule', incomeIds: [receiptB.id] } });
  eq(partB.status, 200, 'second tenant reconciles own receipt');
  const [y, m] = month.split('-').map(Number);
  const nextMonth = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}`;
  const moveBody = { month, expectedRevision: partB.body.revision, expectedVersion: partB.body.events[0].version, status: 'CANCELLED', reason: 'Synthetic residual deferred', incomeIds: [], rescheduleTo: `${nextMonth}-02` };
  const moved = await request(`/invest/payment-events/${eventB.eventKey}`, { method: 'PATCH', cookie: cookieB, body: moveBody });
  eq(moved.status, 200, 'reschedule partial payment'); eq(moved.body.expectedIncome, '100002.13', 'old event no longer adds residual');
  const next = await request(`/invest/budget?month=${nextMonth}`, { cookie: cookieB });
  eq(next.body.expectedIncome, '1899997.87', 'next month includes normal pay + unpaid deferred residual, no duplicate receipt');
  eq(next.body.events.find(e => e.eventKey.startsWith('rescheduled-')).incomeIds, [receiptB.id], 'receipt moves atomically to replacement');
  eq((await request(`/invest/payment-events/${eventB.eventKey}`, { method: 'PATCH', cookie: cookieB, body: moveBody })).status, 409, 'reschedule retry cannot duplicate replacement');
  eq(await legacy(), before, 'Invest leaves all seeded legacy financial rows identical');
  await prisma.income.update({ where: { id: receiptA.id }, data: { amount: '500000.00' } });
  const edited = await request(path, { cookie: cookieA }); eq(edited.body.actualQuota, '100000.00', 'income edit observed without copying'); eq(edited.body.availableToAllocate, null, 'income edit invalidates free cash'); eq(edited.body.plannedQuota, null, 'income edit invalidates receipt acknowledgement');
  const completed = await request(`/invest/payment-events/${event.eventKey}`, { method: 'PATCH', cookie: cookieA, body: { ...update, expectedRevision: edited.body.revision, expectedVersion: edited.body.events[0].version, status: 'COMPLETED' } });
  eq(completed.status, 200, 'edited receipt reviewed'); eq(completed.body.expectedIncome, '500000.00', 'paid in full below estimate has no unpaid residual');
  await prisma.income.delete({ where: { id: receiptA.id } });
  const deleted = await request(path, { cookie: cookieA }); eq(deleted.body.actualQuota, '0.00', 'source deletion observed'); eq(deleted.body.reasonCodes.includes('RECEIPT_CHANGED'), true, 'source link preserved for review');
  await prisma.income.update({ where: { id: pending.id }, data: { status: 'CONFIRMED' } });
  eq((await request(path, { cookie: cookieA })).body.actualQuota, '20.01', 'pending resolution observed');
  process.env.INVEST_ENABLED = 'false'; eq((await request('/invest/status', { cookie: cookieA })).status, 403, 'feature disabled'); eq((await request('/auth/me', { cookie: cookieA })).status, 200, 'Trackster auth unaffected by disabled Invest');
  process.env.INVEST_ENABLED = 'true'; process.env.INVEST_USER_IDS = ''; eq((await request('/invest/status', { cookie: cookieA })).status, 403, 'empty account allowlist denies');
  process.env.INVEST_USER_IDS = `${a.id},${b.id}`;
  const missing = await prisma.incomeStream.create({ data: { userId: a.id, name: 'Synthetic missing estimate', kind: 'FIXED', cadence: 'MONTHLY', source: 'BCA', payDayOfMonth: 15, matchKeywords: [] } });
  const missingBudget = await request(path, { cookie: cookieA });
  eq(missingBudget.body.reasonCodes.includes('MISSING_FORECAST_INPUT'), true, 'missing estimate is unknown, not zero');
  eq(missingBudget.body.plannedQuota, null, 'missing estimate withholds forecast');
  await prisma.incomeStream.delete({ where: { id: missing.id } });
  await prisma.user.update({ where: { id: b.id }, data: { tokenVersion: { increment: 1 } } });
  eq((await request('/invest/status', { cookie: cookieB })).status, 401, 'revoked shared session denied');
  // Leave a clean, explicitly synthetic fixture for browser QA; no external providers/cron.
  await prisma.investReceiptLink.deleteMany({ where: { userId: { in: [a.id, b.id] } } });
  await prisma.investEventAudit.deleteMany({ where: { userId: { in: [a.id, b.id] } } });
  await prisma.investPaymentEvent.deleteMany({ where: { userId: { in: [a.id, b.id] } } });
  await prisma.investMonth.deleteMany({ where: { userId: { in: [a.id, b.id] } } });
  await prisma.income.update({ where: { id: pending.id }, data: { description: 'Synthetic receipt for browser QA', amount: '625000.25' } });
  const { portfolioChecks } = await import('./invest-portfolio-e2e.mjs');
  await portfolioChecks({ prisma, request, eq, a, b, cookieA, cookieB: await login(b.username), month });
  const { marketChecks } = await import('./invest-market-e2e.mjs');
  await marketChecks({ prisma, request, eq, a, b, cookieA, cookieB: await login(b.username), month });
  console.log(`PASS: ${checks} Invest API assertions; tenant isolation, source revisions, serializable writes, shared auth/CORS, and unchanged legacy rows.`);
  if (process.argv.includes('--serve')) {
    console.log(`Synthetic test API ready on http://localhost:${port}; fixture user invest_test_a; stop with Ctrl+C.`);
    await new Promise(resolve => { process.on('SIGINT', resolve); process.on('SIGTERM', resolve); });
  }
} finally {
  await app.close();
}
