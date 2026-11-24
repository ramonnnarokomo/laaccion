import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface NavItem {
  label: string;
  link: string;
  exact?: boolean;
}

/** Cabecera, navegación y pie comunes a todas las páginas públicas (maqueta aprobada). */
@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip-link" href="#contenido">Saltar al contenido</a>
    <div class="site-shell">
      <div class="topline">
        <span>PENSAMIENTO · CULTURA · DEMOCRACIA</span>
        <span>Una publicación independiente</span>
      </div>

      <header class="masthead">
        <div class="masthead-kicker">
          <span>Ideas para comprender<br />nuestro tiempo</span>
          <span>Fundado sobre el pensamiento crítico</span>
        </div>
        <a class="brand-logo" routerLink="/" aria-label="LA ACCIÓN — Ir a la portada">
          <img
            src="/img/logo-1120.webp"
            srcset="/img/logo-560.webp 560w, /img/logo-1120.webp 1120w, /img/logo-1680.webp 1680w"
            sizes="(max-width: 1188px) calc(100vw - 68px), 1120px"
            width="1120"
            height="373"
            alt="LA ACCIÓN — Pensamiento, Cultura, Democracia"
            fetchpriority="high"
          />
        </a>
        <div class="edition">
          <span>EDICIÓN DIGITAL</span>
          <span>LECTURA, ANÁLISIS Y PARTICIPACIÓN</span>
        </div>
      </header>

      <nav class="nav" aria-label="Secciones principales">
        @for (item of nav; track item.link) {
          <a
            [routerLink]="item.link"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: !!item.exact }"
            ariaCurrentWhenActive="page"
            >{{ item.label }}</a
          >
        }
      </nav>

      <main id="contenido" tabindex="-1">
        <router-outlet />
      </main>

      <footer class="site-footer">
        <span>© {{ year }} LA ACCIÓN · Publicación independiente</span>
        <nav aria-label="Información legal">
          <a routerLink="/quienes-somos">Quiénes somos</a>
          <a routerLink="/aviso-legal">Aviso legal</a>
          <a routerLink="/privacidad">Privacidad</a>
          <a routerLink="/cookies">Cookies</a>
          <a href="/rss.xml">RSS</a>
        </nav>
        <span>Información · Pensamiento · Participación</span>
      </footer>
    </div>
  `,
})
export class PublicLayout {
  /** Año en hora de Madrid (igual en servidor y navegador). */
  protected readonly year = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', year: 'numeric' }).format(new Date());

  protected readonly nav: NavItem[] = [
    { label: 'La Acción', link: '/seccion/la-accion' },
    { label: 'Texto fundacional', link: '/texto-fundacional' },
    { label: 'La Mónada', link: '/seccion/la-monada' },
    { label: 'La Asociación', link: '/seccion/la-asociacion' },
    { label: 'La Comunidad', link: '/seccion/la-comunidad' },
    { label: 'El Tablón', link: '/tablon' },
    { label: 'Encuestas', link: '/encuestas' },
  ];
}
