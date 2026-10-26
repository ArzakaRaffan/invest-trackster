// Optional browser fixture, only started from the guarded invest-e2e.mjs loopback harness.
import { createServer } from 'node:http';
export async function startExplanationFixture() {
  let mode = 'valid', calls = 0;
  const server = createServer(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk;
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/__fixture/mode' && req.method === 'POST') { mode = JSON.parse(raw).mode; res.end(JSON.stringify({ mode, calls })); return; }
    if (req.url === '/__fixture/status') { res.end(JSON.stringify({ mode, calls })); return; }
    if (req.url !== '/v1/chat/completions') { res.statusCode = 404; res.end('{}'); return; }
    calls++; const packet = JSON.parse(JSON.parse(raw).messages[1].content);
    await new Promise(resolve => setTimeout(resolve, 100));
    if (mode === 'quota') { res.statusCode = 429; res.end('{"error":"Synthetic provider quota"}'); return; }
    const selection = { version: packet.version, blocks: packet.blocks.map(b => ({ claimId: b.claimId, variant: b.claimId === 'status' ? 'brief' : 'detail', sourceIds: b.sourceIds })) };
    if (mode === 'invalid') selection.narrative = 'Unsupported synthetic future-return claim';
    res.end(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(selection) } }] }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  Object.assign(process.env, { INVEST_AI_ENABLED: 'true', AI_BASE_URL: url, AI_API_KEY: 'synthetic-browser-only', AI_MODEL_FAST: 'synthetic-browser-model' });
  console.log(`Synthetic explanation provider: ${url}`);
  return { close: () => new Promise(resolve => server.close(resolve)) };
}
