# La Acción — laaccion.com

Periódico digital sobre acción y libertad política colectiva.

- **backend/** — API REST (Spring Boot 4.1, Java 17+, PostgreSQL). Primera versión.
- **frontend/** — Angular 21 con SSR: web pública y panel editorial. Ver `frontend/README.md`.

## Arrancar el backend en local

Requisitos: JDK 17 o superior, Maven 3.9+ y Docker. (El código se compila para Java 17; la imagen Docker usa Java 21.)

```bash
cp .env.example .env            # y rellena APP_BOOTSTRAP_ADMIN_EMAIL / _PASSWORD (mín. 12 caracteres)
docker compose up -d            # PostgreSQL en localhost:5432
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

En PowerShell, entrecomilla el argumento (`"-Dspring-boot.run.profiles=dev"`) o usa
`$env:SPRING_PROFILES_ACTIVE="dev"; mvn spring-boot:run`.

Las variables de `.env` las lee `docker compose`; para que también las vea la aplicación, defínelas en
tu terminal (`$env:APP_BOOTSTRAP_ADMIN_EMAIL="..."`) o en la configuración de ejecución del IDE.

- API: http://localhost:8080/api/v1
- Swagger UI (solo perfil `dev`): http://localhost:8080/swagger-ui.html
- Salud: http://localhost:8080/actuator/health

No hay perfil por defecto a propósito: sin `SPRING_PROFILES_ACTIVE` la aplicación no arranca, para
que nunca se despliegue con la configuración de desarrollo por descuido.

### Tests

```bash
mvn verify                               # todo (los de integración necesitan Docker)
mvn test -DexcludedGroups=integration    # solo unitarios, sin Docker
```

## Estructura del backend

Un paquete por funcionalidad y, dentro, las capas controller → service → repository. Las entidades
JPA nunca salen del servicio: los controladores solo manejan DTOs (records).

| Paquete | Qué contiene |
|---|---|
| `article` | Artículos, saneado del HTML del editor, slugs, publicación programada |
| `category`, `tag` | Secciones y etiquetas |
| `announcement` | El Tablón (anuncios vigentes / caducados / ocultos) |
| `poll`, `captcha` | Encuestas con voto anónimo y verificación Turnstile |
| `image`, `storage` | Subida de imágenes y almacenamiento (local en dev, S3/R2 en producción) |
| `auth`, `security`, `user` | Login con sesión, roles, bloqueo por intentos, usuarios del panel |
| `audit` | Registro de quién publica, edita o borra qué |
| `common`, `config` | Errores (problem+json), paginación, rate limit, configuración |

## API (v1)

Público (sin sesión):

| Método | Ruta | |
|---|---|---|
| GET | `/api/v1/articles?category=&tag=&page=&size=` | Artículos publicados |
| GET | `/api/v1/articles/{slug}` | Artículo completo |
| GET | `/api/v1/categories` · `/api/v1/tags` | Secciones y etiquetas |
| GET | `/api/v1/announcements/board` | Tablón: 10 vigentes + 25 caducados |
| GET | `/api/v1/polls` · `/api/v1/polls/{id}` | Encuestas abiertas y cerradas |
| POST | `/api/v1/polls/{id}/votes` | Votar (`optionId`, `captchaToken`) |

Sesión:

| Método | Ruta | |
|---|---|---|
| GET | `/api/v1/auth/csrf` | Emite la cookie `XSRF-TOKEN` |
| POST | `/api/v1/auth/login` · `/logout` | Abrir y cerrar sesión |
| GET | `/api/v1/auth/me` | Usuario actual |
| POST | `/api/v1/auth/password` | Cambiar la propia contraseña |

Panel (`/api/v1/admin/**`, rol ADMIN o EDITOR): `articles`, `announcements` (+ `/metrics`), `polls`
(+ `/{id}/open`, `/{id}/close`), `images`; y solo ADMIN: `categories`, `users`, `audit`.

Todos los listados van paginados (`page`, `size` ≤ 50) y los errores salen como
`application/problem+json`.

### Cómo se autentica el front

1. Al arrancar, `GET /api/v1/auth/csrf` → el back deja la cookie `XSRF-TOKEN`.
2. En cada POST/PUT/DELETE se envía ese valor en la cabecera `X-XSRF-TOKEN` (el `HttpClient` de
   Angular lo hace solo si front y API comparten origen).
3. `POST /api/v1/auth/login` → cookie de sesión `HttpOnly`. Tras el login el token CSRF cambia, y al
   cerrar sesión se borra: después de un logout hay que volver a pedir `/auth/csrf`.

El servidor SSR de Angular hace de proxy de `/api` y `/media` hacia el back: mismo origen, sin CORS
y sin exponer el back a internet. El front ya gestiona todo esto (`frontend/src/app/core/http/`).

## Variables de entorno en producción (Railway)

`SPRING_PROFILES_ACTIVE=prod`. Las marcadas con * son obligatorias: si falta alguna, no arranca.

| Variable | Para qué |
|---|---|
| `DB_URL` * | `jdbc:postgresql://${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}` (red privada) |
| `DB_USERNAME` *, `DB_PASSWORD` * | Usuario de aplicación de la BD |
| `APP_PUBLIC_BASE_URL` * | `https://laaccion.com` |
| `APP_CORS_ALLOWED_ORIGINS` * | Orígenes del front, separados por comas |
| `APP_IP_HASH_SECRET` * | Secreto aleatorio (≥ 32 caracteres) para el control de voto duplicado |
| `TURNSTILE_SECRET_KEY` * | Clave secreta de Cloudflare Turnstile |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_PUBLIC_BASE_URL` | Almacenamiento de imágenes (obligatorias salvo `S3_ENDPOINT`, que solo hace falta fuera de AWS) |
| `APP_CLIENT_IP_HEADER` | `X-Client-IP`: la IP real del lector se la pasa el SSR del front (que ya resuelve Cloudflare si va delante) |
| `APP_COOKIE_DOMAIN` | Solo si front y API van en subdominios distintos |
| `APP_BOOTSTRAP_ADMIN_EMAIL`, `APP_BOOTSTRAP_ADMIN_PASSWORD` | Primer administrador; quitarlas después |

En Railway: directorio raíz del servicio `backend/` (usa el `Dockerfile`), healthcheck en
`/actuator/health`, y ni el back ni la base de datos con networking público: el dominio va al
servicio del front, que habla con el back por la red privada.

## Decisiones tomadas y por qué

- **Sesión con cookie en vez de JWT.** Panel interno con dos o tres usuarios: menos piezas y
  revocación inmediata (si se desactiva un usuario, su sesión muere en la siguiente petición).
  La sesión vive en memoria: cada despliegue cierra las sesiones abiertas.
- **Sin cuentas de lector ni comentarios en la v1.** Solo ADMIN y EDITOR.
- **Voto anónimo de verdad.** De cada voto solo se guarda un hash (HMAC de encuesta + IP) para evitar
  duplicados, sin la opción elegida, y esos hashes se borran al cerrar la encuesta. La opinión
  política (art. 9 RGPD) no queda ligada a nadie. Contrapartida: un voto por IP, así que quienes
  comparten conexión (una casa, una facultad, una red móvil) comparten voto.
- **"Programado" no es un estado guardado.** Es un artículo publicado con fecha futura; se hace
  visible solo, sin tareas programadas.
- **El HTML del editor se sanea en el servidor** con lista blanca (jsoup) antes de guardarlo.
- **Rate limit en memoria** (login, voto, subida). Vale con una sola instancia; el de Cloudflare
  debe ser la primera línea.

## Pendiente en el backend

- Quitar los metadatos EXIF (GPS incluido) de las fotos subidas.
- 2FA para administradores.
- Sesiones persistentes (Spring Session JDBC) si molestan los cierres de sesión al desplegar.
- Lint en CI (Checkstyle o Spotless) y escaneo de dependencias (OWASP Dependency-Check).
