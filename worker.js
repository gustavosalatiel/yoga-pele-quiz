// ════════════════════════════════════════════════════════════════
//  CLOUDFLARE WORKER — Meta Conversions API (CAPI) Proxy
//  Resolve bloqueio de iOS + adblockers (Safari ITP, uBlock, etc.)
//  Deploy: Cloudflare Dashboard → Workers & Pages → Criar Worker
// ════════════════════════════════════════════════════════════════

// ── CONFIGURAÇÃO ── substitua os valores abaixo ──────────────────
const FB_PIXEL_ID     = 'SEU_PIXEL_ID';        // Ex: 1234567890123456
const FB_ACCESS_TOKEN = 'SEU_ACCESS_TOKEN';     // Token do Sistema (CAPI)
const FB_API_VERSION  = 'v19.0';

// Domínios autorizados a chamar este worker (seu site / GitHub Pages)
const ALLOWED_ORIGINS = [
  'https://gustavosalatiel.github.io',
  'https://www.seudominio.com',          // substitua pelo seu domínio
];
// ─────────────────────────────────────────────────────────────────

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  const corsHeaders = {
    'Access-Control-Allow-Origin' : allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age'      : '86400',
    'Vary'                        : 'Origin',
  };

  // ── Preflight CORS ──
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // ── Lê body ──
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400, corsHeaders);
  }

  // ── Extrai cookies da requisição (1st-party) ──
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const referer = request.headers.get('Referer') || '';

  // ── FBC Fix ──────────────────────────────────────────────────
  // Prioridade: cookie _fbc → body.fbc → constrói do fbclid na URL
  let fbc = cookies['_fbc'] || body.fbc || null;
  if (!fbc) {
    const fbclid = getParam(referer, 'fbclid') || body.fbclid || null;
    if (fbclid) {
      fbc = `fb.1.${Math.floor(Date.now() / 1000)}.${fbclid}`;
    }
  }
  const fbp = cookies['_fbp'] || body.fbp || null;

  // ── Monta eventos CAPI ──
  const rawEvents = Array.isArray(body.events) ? body.events : [];
  if (!rawEvents.length) {
    return json({ error: 'No events provided' }, 400, corsHeaders);
  }

  const events = rawEvents.map(ev => {
    const ud = stripUndefined({
      client_ip_address : request.headers.get('CF-Connecting-IP') || undefined,
      client_user_agent : request.headers.get('User-Agent')        || undefined,
      fbc               : fbc  || undefined,
      fbp               : fbp  || undefined,
      ...(ev.user_data  || {}),
    });

    return stripUndefined({
      event_name       : ev.event_name,
      event_time       : ev.event_time || Math.floor(Date.now() / 1000),
      event_source_url : ev.event_source_url || referer || undefined,
      action_source    : 'website',
      event_id         : ev.event_id || crypto.randomUUID(),
      user_data        : ud,
      custom_data      : ev.custom_data || undefined,
    });
  });

  // ── Envia para a CAPI da Meta ──
  let capiRes;
  try {
    capiRes = await fetch(
      `https://graph.facebook.com/${FB_API_VERSION}/${FB_PIXEL_ID}/events?access_token=${FB_ACCESS_TOKEN}`,
      {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          data         : events,
          partner_agent: 'cloudflare-worker-capi-proxy',
        }),
      }
    );
  } catch (err) {
    return json({ error: 'CAPI upstream error', detail: err.message }, 502, corsHeaders);
  }

  const capiData = await capiRes.json();
  return json(capiData, capiRes.status, corsHeaders);
}

// ── Helpers ──────────────────────────────────────────────────────
function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

function parseCookies(str) {
  return str.split(';').reduce((acc, pair) => {
    const [k, ...v] = pair.split('=');
    if (k && k.trim()) acc[k.trim()] = v.join('=').trim();
    return acc;
  }, {});
}

function getParam(url, key) {
  try { return new URL(url).searchParams.get(key); }
  catch { return null; }
}

function stripUndefined(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)
  );
}
