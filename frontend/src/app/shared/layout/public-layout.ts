import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, PLATFORM_ID, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, Scroll } from '@angular/router';
import { filter } from 'rxjs';

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

      <header class="masthead" #masthead>
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
            (click)="onNavClick($event)"
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
  private readonly router = inject(Router);
  private readonly masthead = viewChild.required<ElementRef<HTMLElement>>('masthead');
  /** Se marca al pulsar una sección y se consume en el siguiente evento de scroll del router. */
  private navClicked = false;

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    this.router.events
      .pipe(
        filter((e): e is Scroll => e instanceof Scroll),
        takeUntilDestroyed(),
      )
      .subscribe((e) => {
        const fromNav = this.navClicked;
        this.navClicked = false;
        // «Atrás»/«adelante» y los enlaces con #ancla siguen como siempre.
        if (!fromNav || e.position || e.anchor) return;
        // El router acaba de pedir subir arriba del todo. Lo corregimos ahora y otra vez en el
        // siguiente fotograma, por si su suscripción se ejecuta después que la nuestra.
        this.scrollToSections();
        requestAnimationFrame(() => this.scrollToSections());
      });
  }

  protected onNavClick(event: MouseEvent): void {
    // Igual que RouterLink: solo el clic normal navega dentro de la web (no Ctrl/Cmd/rueda).
    this.navClicked = event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey;
  }

  /**
   * Baja hasta la barra de secciones, dejando la cabecera del logo fuera de la vista, para que al
   * entrar en una sección se vea su contenido sin tener que desplazarse. En móvil la barra es fija,
   * así que se mide desde el final de la cabecera y no desde la propia barra.
   */
  private scrollToSections(): void {
    const top = Math.round(this.masthead().nativeElement.getBoundingClientRect().bottom + window.scrollY);
    const distance = Math.abs(window.scrollY - top);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const far = distance > window.innerHeight * 1.5;
    // Siempre se llama a scrollTo, aunque ya estemos en el sitio: así se cancela la subida suave
    // hacia arriba que el router puede haber empezado.
    window.scrollTo({ top, behavior: reduceMotion || far || distance < 4 ? 'instant' : 'smooth' });
  }

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
