import { Injectable } from '@nestjs/common';
import { explanationPacket, ExplanationEvidence, validateExplanation } from './invest-explanation';

export function investAiConfig() {
  if (process.env.INVEST_AI_ENABLED !== 'true') return null;
  const key = process.env.AI_API_KEY?.trim(), model = (process.env.AI_MODEL_FAST || process.env.AI_MODEL)?.trim();
  if (!key || !model) return null;
  try {
    const url = new URL(process.env.AI_BASE_URL || 'http://host.docker.internal:20128');
    const internal = ['127.0.0.1', 'localhost', '[::1]', 'host.docker.internal'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && internal)) || url.username || url.password || url.search || url.hash) return null;
    return { url: `${url.toString().replace(/\/$/, '')}/v1/chat/completions`, key, model };
  } catch { return null; }
}

const SYSTEM = `You edit the presentation of an investment explanation. All claims and their order are fixed by the server. Select brief or detail for EACH block based on clarity and avoid unnecessary repetition. Use detail for risk, forecast and evidence limitations. Return ONLY JSON: {"version":"the supplied version","blocks":[{"claimId":"supplied id","variant":"brief or detail","sourceIds":["exact supplied source IDs"]}]}. Preserve block order and every sourceIds array exactly. Do not write narrative, numbers, rankings, tools, instructions, URLs or new claims. No extra fields. If unable, refuse; the application will use its rule templates.`;

/** Isolated adapter: no chat memory, financial tools, provider body logging, retries, or cron module import. */
@Injectable()
export class InvestExplanationProvider {
  async generate(e: ExplanationEvidence, transport: typeof fetch = fetch, timeoutMs = 12000) {
    const config = investAiConfig();
    if (!config) return { selection: null, reason: 'DISABLED' } as const;
    const signal = AbortSignal.timeout(timeoutMs);
    try {
      const response = await transport(config.url, {
        method: 'POST', redirect: 'error', signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.key}` },
        body: JSON.stringify({ model: config.model, stream: false, max_tokens: 1200, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: JSON.stringify(explanationPacket(e)) }] }),
      });
      if (!response.ok) { await response.body?.cancel(); return { selection: null, reason: response.status === 429 ? 'PROVIDER_QUOTA' : 'PROVIDER_ERROR' } as const; }
      if (!response.body || !response.headers.get('content-type')?.includes('application/json')) { await response.body?.cancel(); return { selection: null, reason: 'INVALID_OUTPUT' } as const; }
      // Read with a hard cap, including responses without Content-Length; never log rejected content.
      const reader = response.body.getReader(), chunks: Uint8Array[] = []; let length = 0;
      try {
        while (true) {
          const chunk = await reader.read(); if (chunk.done) break;
          length += chunk.value.byteLength;
          if (length > 32768) { await reader.cancel(); return { selection: null, reason: 'INVALID_OUTPUT' } as const; }
          chunks.push(chunk.value);
        }
      } finally { reader.releaseLock(); }
      const data = JSON.parse(Buffer.concat(chunks).toString('utf8')), choice = data?.choices?.[0], message = choice?.message;
      if (choice?.finish_reason !== 'stop' || message?.refusal || message?.tool_calls || typeof message?.content !== 'string') return { selection: null, reason: 'INVALID_OUTPUT' } as const;
      const selection = validateExplanation(message.content, e);
      return { selection, reason: selection ? null : 'INVALID_OUTPUT' };
    } catch { return { selection: null, reason: signal.aborted ? 'TIMEOUT' : 'PROVIDER_ERROR' } as const; }
  }
}
