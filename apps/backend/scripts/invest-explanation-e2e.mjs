// Invoked only by the loopback/fresh-database Invest harness. All provider traffic stays on loopback.
import { createServer } from 'node:http';
export async function explanationChecks({ prisma, request, eq, get, cookieA, cookieB, a, evaluation }) {
  const path = id => `/invest/evaluations/${id}/explanation`;
  const read = (id = evaluation.id, language = 'id', cookie = cookieA) => request(`${path(id)}?language=${language}`, { cookie });
  const post = (id = evaluation.id, language = 'id', cookie = cookieA, extra = {}) => request(path(id), { cookie, method: 'POST', body: { language, ...extra } });
  const original = await prisma.investEvaluation.findFirst({ where: { id: evaluation.id, userId: a.id } });
  const fresh = () => { const { id, createdAt, ...data } = original; return prisma.investEvaluation.create({ data }); };
  const financial = async () => { const s = await get(); return { revision: s.revision, ledger: s.ledger, holdings: s.holdings, budget: { used: s.budget.usedQuota, reserved: s.budget.reservations } }; };
  const before = await financial();
  eq((await read()).status, 200, 'rules explanation available without provider');
  eq((await read()).body.origin, 'RULES', 'default is honest rule provenance');
  eq((await post()).body.fallbackReason, 'DISABLED', 'disabled provider returns rules');
  eq(await prisma.aiUsage.count({ where: { userId: a.id, kind: { contains: '/explanation' } } }), 0, 'disabled provider consumes no AI quota');
  eq((await read(evaluation.id, 'id', cookieB)).status, 404, 'foreign explanation hidden');
  eq((await post(evaluation.id, 'id', cookieB)).status, 404, 'foreign post hidden before quota');
  eq((await request(path(evaluation.id), { method: 'POST', body: { language: 'id' } })).status, 401, 'explanation requires session');
  const denied = await request('/auth/login', { method: 'POST', body: { username: 'invest_test_denied', password: 'synthetic-invest-only' } });
  const deniedCookie = denied.headers.get('set-cookie').split(';')[0];
  eq((await post(evaluation.id, 'id', deniedCookie)).status, 403, 'Invest access guard precedes AI');
  eq((await read(evaluation.id, 'invalid')).status, 400, 'unknown language rejected');
  eq((await post(evaluation.id, 'id', cookieA, { userId: a.id })).status, 400, 'raw unknown identity rejected');
  eq((await post(evaluation.id, 'id', cookieA, { result: { amount: '1' } })).status, 400, 'client cannot supply authoritative facts');
  const base = (await read()).body;
  eq(base.sources.every(s => /^https:\/\//.test(s.url)), true, 'citations only verified snapshot URLs');
  eq((await read()).headers.get('cache-control'), 'no-store', 'private explanation response not public cached');
  let calls = 0, mode = 'valid'; const packets = [];
  const server = createServer(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw); calls++; const packet = JSON.parse(body.messages[1].content); packets.push(packet);
    await new Promise(resolve => setTimeout(resolve, 80));
    res.setHeader('Content-Type', 'application/json');
    if (mode === 'quota') { res.statusCode = 429; res.end('{"error":"private test body"}'); return; }
    const selection = { version: packet.version, blocks: packet.blocks.map(b => ({ claimId: b.claimId, variant: 'brief', sourceIds: b.sourceIds })) };
    if (mode === 'invalid') selection.amount = 'invented';
    res.end(JSON.stringify({ choices: [{ finish_reason: mode === 'truncated' ? 'length' : 'stop', message: { content: JSON.stringify(selection) } }] }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const keys = ['INVEST_AI_ENABLED', 'AI_BASE_URL', 'AI_API_KEY', 'AI_MODEL_FAST'];
  const saved = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  Object.assign(process.env, { INVEST_AI_ENABLED: 'true', AI_BASE_URL: `http://127.0.0.1:${server.address().port}`, AI_API_KEY: 'synthetic-provider-only', AI_MODEL_FAST: 'synthetic-model' });
  try {
    eq((await read()).body.aiAvailable, true, 'explicit configured opt-in enables assistance');
    const concurrent = await Promise.all([post(), post()]);
    eq(concurrent.map(r => r.status), [201, 201], 'concurrent request returns result or rule fallback');
    eq(calls, 1, 'one provider call across concurrent requests');
    const generated = (await read()).body;
    eq(generated.origin, 'AI_ASSISTED', 'validated selection persisted');
    eq(generated.blocks.map(b => [b.id, b.facts, b.sourceIds]), base.blocks.map(b => [b.id, b.facts, b.sourceIds]), 'AI cannot change facts or ordering');
    eq((await post()).body, generated, 'lost-response retry replays exact result');
    eq(calls, 1, 'cached replay consumes no provider request');
    eq(await prisma.investMutation.count({ where: { userId: a.id, route: path(evaluation.id) } }), 1, 'one private artifact per locale/version');
    for (const field of ['userId', 'evaluationId', 'goal', 'profile', 'holdings', 'budgetIDR', 'instruments']) eq(JSON.stringify(packets).includes(`"${field}"`), false, 'private snapshot fields absent from model payload');
    eq((await post(evaluation.id, 'en')).body.language, 'en', 'separate language explanation');
    eq(calls, 2, 'one call for each requested language');
    for (const [failure, reason] of [['invalid', 'INVALID_OUTPUT'], ['quota', 'PROVIDER_QUOTA'], ['truncated', 'INVALID_OUTPUT']]) {
      mode = failure; const row = await fresh(); const result = await post(row.id);
      eq(result.status, 201, 'provider failure keeps result usable');
      eq(result.body.origin, 'RULES', 'failure selects rule fallback'); eq(result.body.fallbackReason, reason, 'safe failure code');
      const previousCalls = calls; eq((await post(row.id)).body, result.body, 'failure cooldown replay'); eq(calls, previousCalls, 'failure cooldown does not repeat cost');
    }
    mode = 'valid';
    const pending = await fresh(); const until = new Date(Date.now() + 60000).toISOString();
    await prisma.investMutation.create({ data: { userId: a.id, route: path(pending.id), key: `${base.version}:id`, bodyHash: base.evidenceHash, response: { token: 'crashed-worker', state: 'PENDING', selection: null, reason: null, completedAt: null, until } } });
    eq((await post(pending.id)).body.fallbackReason, 'IN_PROGRESS', 'in-flight lease keeps readable rules');
    await prisma.investMutation.updateMany({ where: { userId: a.id, route: path(pending.id) }, data: { response: { token: 'crashed-worker', state: 'PENDING', selection: null, reason: null, completedAt: null, until: '2020-01-01T00:00:00Z' } } });
    eq((await read(pending.id)).body.fallbackReason, 'INTERRUPTED', 'expired crashed lease is readable');
    eq((await post(pending.id)).body.origin, 'AI_ASSISTED', 'expired lease can be explicitly retried');
    const usage = await prisma.aiUsage.findFirst({ where: { userId: a.id, kind: { contains: '/explanation' } } });
    await prisma.aiUsage.updateMany({ where: { userId: a.id, id: usage.id }, data: { count: 100000 } });
    const limited = await fresh(); const priorCalls = calls;
    eq((await post(limited.id)).status, 429, 'persistent user quota enforced');
    eq(calls, priorCalls, 'local quota blocks provider');
    eq((await read(limited.id)).body.origin, 'RULES', 'read fallback is never rate limited');
    eq((await post()).body, generated, 'cached replay works after quota exhaustion');
    const quotaBeforeForeign = await prisma.aiUsage.findMany({ where: { userId: a.id } });
    eq((await post(limited.id, 'id', cookieB)).status, 404, 'foreign request hidden even when owner quota full');
    eq(await prisma.aiUsage.findMany({ where: { userId: a.id } }), quotaBeforeForeign, 'foreign request consumes no owner quota');
    eq(await financial(), before, 'explanations leave financial revision and movements unchanged');
    eq(await prisma.investEvaluation.findFirst({ where: { id: evaluation.id, userId: a.id } }), original, 'immutable evaluation untouched');
  } finally {
    for (const k of keys) { if (saved[k] == null) delete process.env[k]; else process.env[k] = saved[k]; }
    await new Promise(resolve => server.close(resolve));
  }
}
