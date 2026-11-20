# La Acción — frontend

Angular 21 con renderizado en servidor (SSR). Es la web pública (portada, artículos, secciones,
etiquetas, El Tablón, encuestas, texto fundacional y páginas legales) y el panel editorial en `/panel`.

## Arrancar en local

Requisitos: Node 20.19+, 22.12+ o 24, y el backend corriendo en `localhost:8080` (ver el README raíz).

```bash
npm install
npm start            # http://localhost:4300 (con SSR; /api y /media van al back por proxy.conf.json)
```

- Panel: http://localhost:4300/panel (usuario creado con `APP_BOOTSTRAP_ADMIN_*` en el back).
- Tests: `npx ng test --watch=false` (Vitest).
- Build de producción: `npm run build` y luego `npm run serve:ssr` (puerto 4000). Con
  `API_URL=http://localhost:8080` si el back no está en el puerto por defecto.

## Cómo está montado

```
navegador ──► servidor SSR (Node/Express, este proyecto) ──► backend Spring (red privada)
               · pinta el HTML con los datos ya dentro (SEO y vistas previas en redes)
               · hace de proxy de /api y /media → mismo dominio, sin CORS, cookies propias
               · robots.txt, sitemap.xml, rss.xml, /healthz y cabeceras de seguridad
```

- **Rutas**: todo se renderiza en el servidor en cada petición salvo el texto fundacional y las
  páginas legales (se generan en el build) y `/panel/**` (solo navegador, no se indexa).
- **Sin peticiones dobles**: lo que el servidor pide a la API viaja dentro del HTML y el navegador
  lo reutiliza al hidratar. Para eso `server.ts` desvía el `fetch` del SSR al back (ver comentario).
- **404 de verdad**: un artículo, sección, etiqueta o encuesta que no existe responde 404 (no un 200
  con un mensaje), y los errores del back responden 503.
- **SEO**: título, descripción, canónica, Open Graph, Twitter Cards y JSON-LD (`NewsArticle`,
  `WebSite`, `CollectionPage`) por página. Las etiquetas van con `noindex` (páginas finas).
- **Vídeos** (YouTube, TikTok, Instagram, Vimeo): no se cargan hasta que el lector pulsa «Cargar
  vídeo». Así no hay cookies de terceros sin permiso y no hace falta banner de cookies.
- **Encuestas**: voto con Cloudflare Turnstile (invisible salvo que sospeche) y CSRF. La lista de
  encuestas votadas se recuerda en `localStorage` solo para mostrar resultados.
- **CSP**: `script-src` sin `'unsafe-inline'`; los scripts en línea de Angular se permiten por hash,
  calculado en cada respuesta (el `autoCsp` de Angular no funciona con SSR).
- **Panel**: login con sesión de cookie del back + CSRF (lo gestiona `csrf.interceptor.ts`, que
  pide el token si falta y reintenta una vez si caduca). Editor TipTap con imágenes de la biblioteca
  y vídeos. Un editor solo puede modificar sus artículos; las secciones, usuarios y auditoría son
  solo para administración (los guards son comodidad: la seguridad real la pone el back).

```
src/app/
  core/      api (modelos y servicios), auth, http (interceptores), seo, util (fechas, vídeos, captcha…)
  shared/    cabecera y pie, tarjetas, paginación, vídeo bajo demanda
  features/  home, article, listing (sección/etiqueta), board (tablón), polls, fundacional, legal,
             not-found, panel/
src/server.ts  servidor Express (proxy, SSR, sitemap, RSS, cabeceras)
```

## Despliegue en Railway

Servicio nuevo con directorio raíz `frontend/` (usa el `Dockerfile`), healthcheck en `/healthz` y el
dominio público (`laaccion.com`) apuntando a **este** servicio. El backend se queda sin dominio
público: solo se habla con él por la red privada.

| Variable | Valor |
|---|---|
| `API_URL` | `http://${{backend.RAILWAY_PRIVATE_DOMAIN}}:8080` (nombre de tu servicio del back) |
| `SITE_URL` | `https://laaccion.com` |
| `NG_ALLOWED_HOSTS` | Dominios extra que no estén ya en `angular.json` (separados por comas) |
| `TRUST_PROXY_HOPS` | `1` (el proxy de Railway). `2` si además pones Cloudflare delante |
| `TURNSTILE_SITE_KEY` | Site key **pública** de Turnstile (la secreta va en el back) |
| `CLIENT_IP_HEADER` | Solo si TODO el tráfico entra por Cloudflare: `cf-connecting-ip` (si se puede llegar sin pasar por Cloudflare, esa cabecera se puede falsificar) |

En el **backend** hay que poner `APP_CLIENT_IP_HEADER=X-Client-IP` (el SSR le pasa la IP real del
lector; si no, todos los votos parecerían venir de la misma IP) y `APP_CORS_ALLOWED_ORIGINS` con
`https://laaccion.com`.

## Antes de publicar

- Rellenar los datos entre corchetes de `features/legal/legal-page.html` (titular, NIF, dirección,
  correo) y que alguien con criterio legal revise los textos.
- Crear el sitio en Cloudflare Turnstile (dominio `laaccion.com`) y poner las dos claves.
- El menú tiene fijas las cuatro secciones sembradas por el back (`la-accion`, `la-monada`,
  `la-asociacion`, `la-comunidad`). Una sección nueva tiene su página en `/seccion/<slug>` pero no
  aparece en el menú hasta añadirla en `shared/layout/public-layout.ts`.
