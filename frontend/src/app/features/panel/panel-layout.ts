import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { SeoService } from '../../core/seo/seo.service';

@Component({
  selector: 'app-panel-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './panel.scss',
  template: `
    <div class="panel">
      <header class="panel-top">
        <a class="panel-brand" routerLink="/panel">LA ACCIÓN <span>Panel editorial</span></a>
        <button class="panel-menu-btn" type="button" (click)="menu.set(!menu())" [attr.aria-expanded]="menu()" aria-controls="panel-nav">
          Menú
        </button>
        <div class="panel-user">
          <span>{{ auth.user()?.displayName }} · {{ auth.isAdmin() ? 'Administración' : 'Edición' }}</span>
          <a href="/" target="_blank" rel="noopener">Ver la web ↗</a>
          <button type="button" class="link-btn" (click)="logout()">Cerrar sesión</button>
        </div>
      </header>
      <div class="panel-body">
        <nav id="panel-nav" class="panel-nav" [class.open]="menu()" aria-label="Panel" (click)="menu.set(false)">
          <span class="panel-nav__group">Contenido</span>
          <a routerLink="articulos" routerLinkActive="active">Artículos</a>
          <a routerLink="tablon" routerLinkActive="active">El Tablón</a>
          <a routerLink="encuestas" routerLinkActive="active">Encuestas</a>
          <a routerLink="imagenes" routerLinkActive="active">Imágenes</a>
          @if (auth.isAdmin()) {
            <span class="panel-nav__group">Administración</span>
            <a routerLink="secciones" routerLinkActive="active">Secciones</a>
            <a routerLink="usuarios" routerLinkActive="active">Usuarios</a>
            <a routerLink="auditoria" routerLinkActive="active">Auditoría</a>
          }
          <span class="panel-nav__group">Cuenta</span>
          <a routerLink="cuenta" routerLinkActive="active">Mi contraseña</a>
          <a class="panel-nav__mobile" href="/" target="_blank" rel="noopener">Ver la web ↗</a>
          <button type="button" class="panel-nav__mobile link-btn" (click)="logout()">Cerrar sesión</button>
        </nav>
        <main class="panel-main" id="contenido">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class PanelLayout {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly menu = signal(false);

  constructor() {
    inject(SeoService).set({ title: 'Panel editorial', path: '/panel', noindex: true });
  }

  protected async logout(): Promise<void> {
    try {
      await this.auth.logout();
    } finally {
      void this.router.navigateByUrl('/panel/login');
    }
  }
}
