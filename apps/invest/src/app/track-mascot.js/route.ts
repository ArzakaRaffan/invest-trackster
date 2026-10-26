import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Serve the existing asset, not a second manually maintained copy.
export async function GET() {
  const source = await readFile(path.join(process.cwd(), '../frontend/public/track-mascot.js'), 'utf8');
  return new Response(source, { headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
