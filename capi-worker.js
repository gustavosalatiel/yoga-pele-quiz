/**
 * Cloudflare Worker — Meta Conversions API (CAPI) Proxy
 * -------------------------------------------------------
 * Resolve bloqueio de iOS / adblockers roteando eventos pelo edge.
 * Inclui correção de FBC (fb_click_id), reconstrução de FBP (fb_browser_id)
 * e suporte a preload via GTM server-side.
 *
 * Deploy:
 *   1. Crie um Worker em dash.cloudflare.com
 *   2. Cole este arquivo no editor
 *   3. Adicione as variáveis de ambiente no painel do Worker:
 *        PIXEL_ID  → seu pixel ID do Meta (ex: 123456789)
 *        ACCESS_TOKEN → seu token de acesso da CAPI (gerado no Events Manager)
 *   4. Configure a rota: seudominio.com/capi/* → este worker
 *
 * No GTM (server-side), envie eventos para: https://seudominio.com/capi/events
 * No pixel do browser, use: fbq('init', PIXEL_ID); + fbq('track', ...)
 *
 * Para usar com GTM server-side preload, adicione em GTM Web:
 *   - Tag personalizada HTML com o script de preload abaixo (ver fim do arquivo)
 */

const META_CAPI_ENDPOINT = "https://graph.facebook.com/v19.0";
const ALLOWED_ORIGIN = "*"; // Restrinja ao seu domínio em produção: "https://seudominio.com"

// ── Utilidades ─────────────────────────────────────────────────────────────

/**
 * Extrai o fbclid da URL de referência ou do cookie _fbc
 * Formato do _fbc: fb.1.{timestamp}.{fbclid}
 */
function extractFbc(request, fbclid) {
  // 1. Prioridade: fbclid passado diretamente pelo cliente
  if (fbclid) {
    const ts = Date.now();
    return `fb.1.${ts}.${fbclid}`;
  }

  // 2. Tenta ler do cookie _fbc existente
  const cookieHeader = request.headers.get("Cookie") || "";
  const fbcMatch = cookieHeader.match(/_fbc=([^;]+)/);
  if (fbcMatch) return decodeURIComponent(fbcMatch[1]);

  // 3. Tenta reconstruir a partir do Referer (UTM params)
  const referer = request.headers.get("Referer") || "";
  try {
    const refUrl = new URL(referer);
    const refFbclid = refUrl.searchParams.get("fbclid");
    if (refFbclid) {
      const ts = Date.now();
      return `fb.1.${ts}.${refFbclid}`;
    }
  } catch (_) {}

  return null;
}

/**
 * Extrai o _fbp do cookie
 */
function extractFbp(request) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const fbpMatch = cookieHeader.match(/_fbp=([^;]+)/);
  return fbpMatch ? decodeURIComponent(fbpMatch[1]) : null;
}

/**
 * Obtém o IP real do visitante (respeita headers de proxy do Cloudflare)
 */
function getClientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0].trim() ||
    null
  );
}

/**
 * Obtém o User-Agent do visitante
 */
function getUserAgent(request) {
  return request.headers.get("User-Agent") || null;
}

/**
 * Cabeçalhos CORS padrão
 */
function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Pixel-ID",
    "Access-Control-Max-Age": "86400",
  };
}

// ── Handler principal ───────────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    // Preflight CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // Rota: POST /capi/events
    if (request.method === "POST" && url.pathname === "/capi/events") {
      return handleCapiEvent(request, env);
    }

    // Rota de health check
    if (url.pathname === "/capi/health") {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
};

// ── Handler de eventos CAPI ─────────────────────────────────────────────────

async function handleCapiEvent(request, env) {
  const PIXEL_ID = env.PIXEL_ID;
  const ACCESS_TOKEN = env.ACCESS_TOKEN;

  if (!PIXEL_ID || !ACCESS_TOKEN) {
    return jsonResponse({ error: "Worker não configurado (PIXEL_ID / ACCESS_TOKEN ausentes)" }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return jsonResponse({ error: "Payload JSON inválido" }, 400);
  }

  // Extrai dados do cliente para enriquecimento
  const clientIp = getClientIp(request);
  const userAgent = getUserAgent(request);
  const fbc = extractFbc(request, body.fbclid || null);
  const fbp = extractFbp(request);

  // Monta o array de eventos
  const events = Array.isArray(body.data) ? body.data : [body];

  const enrichedEvents = events.map((event) => {
    const userData = event.user_data || {};

    // Injeta IP e UA se não fornecidos pelo cliente
    if (!userData.client_ip_address && clientIp) {
      userData.client_ip_address = clientIp;
    }
    if (!userData.client_user_agent && userAgent) {
      userData.client_user_agent = userAgent;
    }

    // Injeta FBC corrigido
    if (!userData.fbc && fbc) {
      userData.fbc = fbc;
    }

    // Injeta FBP
    if (!userData.fbp && fbp) {
      userData.fbp = fbp;
    }

    return { ...event, user_data: userData };
  });

  // Payload final para a Graph API
  const capiPayload = {
    data: enrichedEvents,
    ...(body.test_event_code ? { test_event_code: body.test_event_code } : {}),
  };

  // Encaminha para a Meta CAPI
  const metaUrl = `${META_CAPI_ENDPOINT}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;

  let metaResponse;
  try {
    metaResponse = await fetch(metaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(capiPayload),
    });
  } catch (err) {
    return jsonResponse({ error: "Falha ao conectar na Meta CAPI", detail: err.message }, 502);
  }

  const metaData = await metaResponse.json();

  return jsonResponse(metaData, metaResponse.status, request.headers.get("Origin"));
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function jsonResponse(data, status = 200, origin = "") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

/**
 * ── SCRIPT DE PRELOAD PARA GTM WEB ──────────────────────────────────────────
 *
 * Cole este trecho como uma Tag HTML personalizada no GTM (disparo: All Pages)
 * ANTES das tags de evento. Ele garante que o GTM server-side receba
 * os dados de FBC/FBP mesmo em sessões onde o cookie ainda não foi setado.
 *
 * ⚠️  Substitua YOUR_CAPI_WORKER_URL pela URL do seu Worker implantado.
 *
 * <script>
 * (function() {
 *   // Lê o fbclid da URL atual
 *   var fbclid = new URLSearchParams(window.location.search).get('fbclid');
 *
 *   // Lê cookies _fbc e _fbp
 *   function getCookie(name) {
 *     var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
 *     return match ? decodeURIComponent(match[2]) : null;
 *   }
 *
 *   // Se tem fbclid na URL e _fbc ainda não foi setado, força o cookie
 *   if (fbclid && !getCookie('_fbc')) {
 *     var ts = Date.now();
 *     var fbc = 'fb.1.' + ts + '.' + fbclid;
 *     var d = new Date();
 *     d.setFullYear(d.getFullYear() + 2);
 *     document.cookie = '_fbc=' + encodeURIComponent(fbc) +
 *       '; expires=' + d.toUTCString() +
 *       '; path=/' +
 *       '; SameSite=Lax';
 *   }
 *
 *   // Se _fbp não existe, gera um novo
 *   if (!getCookie('_fbp')) {
 *     var rand = Math.random().toString().slice(2);
 *     var fbp = 'fb.1.' + Date.now() + '.' + rand;
 *     var d2 = new Date();
 *     d2.setFullYear(d2.getFullYear() + 2);
 *     document.cookie = '_fbp=' + encodeURIComponent(fbp) +
 *       '; expires=' + d2.toUTCString() +
 *       '; path=/' +
 *       '; SameSite=Lax';
 *   }
 *
 *   // Expõe no dataLayer para uso nas tags GTM
 *   window.dataLayer = window.dataLayer || [];
 *   window.dataLayer.push({
 *     event: 'capi_preload',
 *     fbc: getCookie('_fbc'),
 *     fbp: getCookie('_fbp'),
 *     fbclid: fbclid || null
 *   });
 * })();
 * </script>
 */
