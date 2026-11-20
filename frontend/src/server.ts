import { AngularNodeAppEngine, createNodeRequestHandler, isMainModule, writeResponseToNodeResponse } from '@angular/ssr/node';
import express, { type NextFunction, type Request as ExpressRequest, type Response as ExpressResponse } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Servidor de LA ACCIÓN (Railway):
 *  - Renderiza Angular en el servidor (SSR) para SEO y vistas previas en redes.
 *  - Hace de proxy de /api y /media hacia el backend por la red privada: el navegador solo habla
 *    con este dominio (sin CORS y con cookies de primera parte) y el backend no queda expuesto.
 *  - Sirve robots.txt, sitemap.xml, rss.xml y /healthz, y añade cabeceras de seguridad.
 *
 * Variables de entorno:
 *  PORT              puerto (Railway lo pone solo)
 *  API_URL           URL interna del backend, p. ej. http://backend.railway.internal:8080
 *  SITE_URL          URL pública canónica, p. ej. https://laaccion.com
 *  NG_ALLOWED_HOSTS  hosts admitidos, separados por comas (además de los de angular.json)
 *  TRUST_PROXY_HOPS  nº de proxies delante (Railway: 1). Necesario para la IP real del lector.
 *  TURNSTILE_SITE_KEY site key pública de Cloudflare Turnstile (la secreta va en el back)
 *  CLIENT_IP_HEADER  solo si Cloudflare va delante: cf-connecting-ip (si no, se usa req.ip)
 */

const env = process.env;
const API_URL = (env['API_URL'] || 'http://localhost:8080').replace(/\/+$/, '');
const SITE_URL = (env['SITE_URL'] || 'https://laaccion.com').replace(/\/+$/, '');
const TRUST_PROXY_HOPS = Number.parseInt(env['TRUST_PROXY_HOPS'] ?? '1', 10);
const IS_PROD = env['NODE_ENV'] === 'production';
const CLIENT_IP_HEADER = (env['CLIENT_IP_HEADER'] ?? '').trim().toLowerCase();
const SITE_HOST = new URL(SITE_URL).host;

const browserDistFolder = join(import.meta.dirname, '../browser');

/**
 * Durante el SSR, Angular convierte las peticiones relativas (/api/...) en absolutas contra el
 * dominio público de la petición entrante. Aquí se desvían directamente al backend por la red
 * privada, sin salir a internet. Se hace a nivel de fetch (y no con un interceptor de Angular) para
 * que la caché de transferencia SSR → navegador use la misma clave en los dos lados y el navegador
 * no repita las peticiones al hidratar.
 */
const nativeFetch = globalThis.fetch.bind(globalThis);
const apiOrigin = new URL(API_URL).origin;
globalThis.fetch = (input: string | URL | globalThis.Request, init?: RequestInit) => {
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  try {
    const url = new URL(raw);
    if (url.origin !== apiOrigin && url.pathname.startsWith('/api/v1/')) {
      const target = API_URL + url.pathname + url.search;
      return nativeFetch(input instanceof globalThis.Request ? new globalThis.Request(target, input) : target, init);
    }
  } catch {
    // URL relativa o no válida: se deja tal cual
  }
  return nativeFetch(input, init);
};

const app = express();
app.disable('x-powered-by');
// Railway pone un proxy delante: sin esto req.ip sería la IP del proxy y todos los votos "vendrían"
// de la misma persona. Se confía en un número fijo de saltos, nunca en cualquier X-Forwarded-For.
app.set('trust proxy', Number.isFinite(TRUST_PROXY_HOPS) ? TRUST_PROXY_HOPS : 1);

const allowedHosts = (env['NG_ALLOWED_HOSTS'] ?? '')
  .split(',')
  .map((h) => h.trim())
  .filter(Boolean);

const angularApp = new AngularNodeAppEngine({
  allowedHosts,
  // Sin esto, Angular 21 ignora las cabeceras X-Forwarded-* del proxy de Railway y cae a render en cliente.
  trustProxyHeaders: ['x-forwarded-for', 'x-forwarded-proto', 'x-forwarded-host', 'x-forwarded-port'],
});

// ------------------------------------------------------------------ Cabeceras de seguridad

/** CSP para respuestas que no son HTML (JSON, XML, imágenes...). */
const BASE_CSP = "default-src 'none'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'";

const FRAME_HOSTS = [
  'https://www.youtube-nocookie.com',
  'https://www.youtube.com',
  'https://www.tiktok.com',
  'https://www.instagram.com',
  'https://player.vimeo.com',
  'https://challenges.cloudflare.com',
];

/**
 * CSP de las páginas. Los <script> en línea que mete Angular (replay de eventos) se permiten por su
 * hash SHA-256, calculado sobre el HTML de cada respuesta: así no hace falta 'unsafe-inline' en scripts.
 * (security.autoCsp de Angular no se puede usar con SSR.)
 */
export function pageCsp(html: string): string {
  const hashes = new Set<string>();
  const inline = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  for (let m = inline.exec(html); m; m = inline.exec(html)) {
    const attrs = m[1];
    if (/\bsrc\s*=/i.test(attrs) || /\btype\s*=\s*["']?application\/(?:ld\+)?json/i.test(attrs)) continue;
    hashes.add(`'sha256-${createHash('sha256').update(m[2], 'utf8').digest('base64')}'`);
  }
  return [
    "default-src 'self'",
    `script-src 'self' ${[...hashes].join(' ')} https://challenges.cloudflare.com`.replace(/\s+/g, ' '),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' https://challenges.cloudflare.com${IS_PROD ? '' : ' ws: wss:'}`,
    `frame-src ${FRAME_HOSTS.join(' ')}`,
    "media-src 'self' https:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    ...(IS_PROD ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

app.use((_req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy', BASE_CSP);
  if (IS_PROD) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

/** Configuración pública que se puede cambiar sin recompilar (solo valores públicos). */
app.get('/config.json', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json({ turnstileSiteKey: env['TURNSTILE_SITE_KEY'] ?? '' });
});

app.get('/healthz', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ status: 'ok' });
});

// En producción: todo a https y a un único dominio (www.laaccion.com → laaccion.com), mejor para SEO.
app.use((req, res, next) => {
  if (!IS_PROD) return next();
  const host = req.get('host') ?? '';
  const wrongHost = host === `www.${SITE_HOST}`;
  if (wrongHost || (req.protocol === 'http' && host === SITE_HOST)) {
    return res.redirect(301, SITE_URL + req.originalUrl);
  }
  next();
});

// ------------------------------------------------------------------ Proxy hacia el backend

const proxy = createProxyMiddleware<ExpressRequest, ExpressResponse>({
  target: API_URL,
  changeOrigin: true,
  xfwd: false,
  proxyTimeout: 30_000,
  timeout: 30_000,
  // Express quita el prefijo montado (/api) de req.url: se vuelve a poner.
  pathRewrite: (_path, req) => req.originalUrl,
  on: {
    proxyReq: (proxyReq, req) => {
      // IP real del lector para el límite de peticiones y el voto único. Se sobrescribe siempre:
      // el valor que mande el cliente nunca llega al back. (Back: APP_CLIENT_IP_HEADER=X-Client-IP)
      proxyReq.removeHeader('x-client-ip');
      proxyReq.removeHeader('x-forwarded-for');
      const forwarded = CLIENT_IP_HEADER ? req.get(CLIENT_IP_HEADER) : undefined;
      proxyReq.setHeader('X-Client-IP', (forwarded ?? req.ip ?? '').split(',')[0].trim());
      proxyReq.setHeader('X-Forwarded-Proto', req.protocol);
      proxyReq.setHeader('X-Forwarded-Host', req.get('host') ?? '');
    },
    error: (_err, _req, res) => {
      const out = res as ExpressResponse;
      if (!out.headersSent) {
        out.status(502).type('application/problem+json').send(
          JSON.stringify({ title: 'Bad Gateway', status: 502, detail: 'El servidor de datos no responde. Inténtalo en unos segundos.' }),
        );
      }
    },
  },
});

app.use('/api', proxy);
app.use('/media', proxy);

// ------------------------------------------------------------------ robots, sitemap y RSS

app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').setHeader('Cache-Control', 'public, max-age=3600');
  res.send(`User-agent: *\nAllow: /\nDisallow: /panel\nDisallow: /api/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
});

interface ArticleItem {
  slug: string;
  title: string;
  summary: string;
  dek: string | null;
  author: string;
  publishedAt: string;
  category: { name: string; slug: string };
  imageUrl: string | null;
}
interface PageOf<T> {
  content: T[];
  totalPages: number;
}

const cache = new Map<string, { at: number; body: string }>();
const CACHE_MS = 10 * 60 * 1000;

async function cached(key: string, build: () => Promise<string>): Promise<string> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.body;
  try {
    const body = await build();
    cache.set(key, { at: Date.now(), body });
    return body;
  } catch (error) {
    if (hit) return hit.body; // si el back falla, mejor la versión anterior que un error
    throw error;
  }
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(API_URL + path, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return (await res.json()) as T;
}

/** Hasta 1.000 artículos (20 páginas de 50, el máximo de la API). */
async function allArticles(limit = 1000): Promise<ArticleItem[]> {
  const out: ArticleItem[] = [];
  for (let page = 0; out.length < limit; page++) {
    const data = await apiGet<PageOf<ArticleItem>>(`/api/v1/articles?page=${page}&size=50`);
    out.push(...data.content);
    if (page + 1 >= data.totalPages || !data.content.length) break;
  }
  return out.slice(0, limit);
}

export function xmlEscape(value: string): string {
  return value.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);
}

app.get('/sitemap.xml', async (_req, res) => {
  try {
    const body = await cached('sitemap', async () => {
      const [articles, categories] = await Promise.all([
        allArticles(),
        apiGet<{ slug: string }[]>('/api/v1/categories'),
      ]);
      const urls: string[] = [
        `<url><loc>${SITE_URL}/</loc><changefreq>hourly</changefreq></url>`,
        `<url><loc>${SITE_URL}/texto-fundacional</loc></url>`,
        `<url><loc>${SITE_URL}/tablon</loc><changefreq>daily</changefreq></url>`,
        `<url><loc>${SITE_URL}/encuestas</loc><changefreq>daily</changefreq></url>`,
        ...categories.map((c) => `<url><loc>${SITE_URL}/seccion/${xmlEscape(c.slug)}</loc><changefreq>daily</changefreq></url>`),
        ...articles.map(
          (a) => `<url><loc>${SITE_URL}/articulo/${xmlEscape(a.slug)}</loc><lastmod>${xmlEscape(a.publishedAt)}</lastmod></url>`,
        ),
      ];
      return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
    });
    res.type('application/xml').setHeader('Cache-Control', 'public, max-age=600');
    res.send(body);
  } catch {
    res.status(503).type('text/plain').send('Sitemap no disponible temporalmente');
  }
});

app.get('/rss.xml', async (_req, res) => {
  try {
    const body = await cached('rss', async () => {
      const page = await apiGet<PageOf<ArticleItem>>('/api/v1/articles?page=0&size=30');
      const items = page.content
        .map((a) => {
          const link = `${SITE_URL}/articulo/${encodeURIComponent(a.slug)}`;
          return [
            '<item>',
            `<title>${xmlEscape(a.title)}</title>`,
            `<link>${link}</link>`,
            `<guid isPermaLink="true">${link}</guid>`,
            `<description>${xmlEscape(a.dek || a.summary)}</description>`,
            `<category>${xmlEscape(a.category.name)}</category>`,
            `<dc:creator>${xmlEscape(a.author)}</dc:creator>`,
            `<pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate>`,
            '</item>',
          ].join('');
        })
        .join('\n');
      return (
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">\n<channel>\n` +
        `<title>LA ACCIÓN</title>\n<link>${SITE_URL}/</link>\n` +
        `<description>Periódico independiente de pensamiento, cultura y democracia.</description>\n<language>es-ES</language>\n` +
        `<atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>\n${items}\n</channel>\n</rss>\n`
      );
    });
    res.type('application/rss+xml').setHeader('Cache-Control', 'public, max-age=600');
    res.send(body);
  } catch {
    res.status(503).type('text/plain').send('RSS no disponible temporalmente');
  }
});

// ------------------------------------------------------------------ Estáticos

const staticCsp = new Map<string, string>();
function staticPageCsp(filePath: string): string {
  let csp = staticCsp.get(filePath);
  if (!csp) {
    csp = pageCsp(readFileSync(filePath, 'utf8'));
    staticCsp.set(filePath, csp);
  }
  return csp;
}

app.use(
  express.static(browserDistFolder, {
    index: false,
    redirect: false,
    setHeaders: (res, filePath) => {
      // Ficheros con hash en el nombre (main-AB12CD34.js): caché de un año. El resto (logos, HTML
      // prerenderizado, manifest...) se revalida para que los cambios se vean.
      if (/[.-][A-Z0-9]{8,}\.(?:js|css|woff2?)$/.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (filePath.endsWith('.html')) {
        // Páginas prerenderizadas (texto fundacional, legales): misma CSP que las de SSR.
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Content-Security-Policy', staticPageCsp(filePath));
      } else {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
    },
  }),
);

// ------------------------------------------------------------------ Angular SSR

app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then(async (response) => {
      if (!response) return next();
      const headers = new Headers(response.headers);
      if (!headers.has('cache-control')) {
        const isPanel = req.path === '/panel' || req.path.startsWith('/panel/');
        // HTML vivo: caché corta en CDN; nunca en el panel ni en errores del servidor.
        headers.set(
          'Cache-Control',
          isPanel || response.status >= 500 ? 'no-store' : 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
        );
      }
      if (!(headers.get('content-type') ?? '').includes('text/html') || !response.body) {
        return writeResponseToNodeResponse(new Response(response.body, { status: response.status, headers }), res);
      }
      const html = await response.text();
      headers.set('Content-Security-Policy', pageCsp(html));
      headers.delete('content-length');
      return writeResponseToNodeResponse(new Response(html, { status: response.status, headers }), res);
    })
    .catch(next);
});

if (isMainModule(import.meta.url) || env['pm_id']) {
  const port = env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) throw error;
    console.log(`LA ACCIÓN escuchando en http://localhost:${port} (API: ${API_URL})`);
  });
}

/** Lo usa el CLI de Angular (ng serve y el prerender del build). */
export const reqHandler = createNodeRequestHandler(app);
