import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SITE_NAME, SeoService, absoluteUrl } from '../../core/seo/seo.service';
import { CONTACT_EMAIL, EDITORS, ORG_ID, WEBSITE_ID, breadcrumbNode, organizationNode } from '../../core/seo/site-data';

/**
 * Quiénes somos: qué es LA ACCIÓN, quién la hace y cómo contactar. Es la página que Google y los
 * buscadores con IA consultan para saber quién está detrás de un medio (la "E" de E-E-A-T).
 * Página estática: se genera en el build (prerender).
 */
@Component({
  selector: 'app-about-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .about {
      max-width: 780px;
      margin: 0 auto;
    }
    h2 {
      font-size: 26px;
      font-weight: 500;
      margin: 36px 0 10px;
    }
    .sections {
      list-style: none;
      padding: 0;
      margin: 12px 0 0;
      display: grid;
      gap: 10px;
      li {
        border-left: 2px solid var(--burgundy);
        padding: 2px 0 2px 14px;
      }
      a {
        font-weight: 600;
      }
    }
    .editors {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      margin-top: 14px;
    }
    .editor {
      border-top: 2px solid var(--ink);
      padding-top: 12px;
      scroll-margin-top: 120px;
      h3 {
        font-size: 22px;
        margin: 0 0 4px;
      }
      p {
        margin: 0;
        font: 14px/1.5 var(--sans);
        color: var(--stone);
      }
    }
  `,
  template: `
    <article class="about">
      <header class="page-head">
        <div class="eyebrow">Quiénes somos</div>
        <h1>LA ACCIÓN</h1>
      </header>

      <div class="prose">
        <p class="lead">
          LA ACCIÓN es un periódico independiente y sin ánimo de lucro de pensamiento, cultura y democracia. Nace de una
          convicción: la libertad política colectiva no puede darse por supuesta. Requiere conocimiento, comprensión de las
          instituciones, conciencia crítica y capacidad ciudadana para intervenir en la vida política.
        </p>

        <h2>Qué hacemos</h2>
        <p>
          Estudiamos la realidad política y sus instituciones, explicamos sus conceptos y confrontamos argumentos para que cada
          lector pueda formar su propio criterio. Nuestra línea editorial parte de una premisa: nunca ha existido una democracia
          formal en España. La desarrollamos en nuestro <a routerLink="/texto-fundacional">texto fundacional</a>.
        </p>

        <h2>Secciones</h2>
        <ul class="sections">
          <li><a routerLink="/seccion/la-accion">La Acción</a> · Ideas y actualidad.</li>
          <li><a routerLink="/seccion/la-monada">La Mónada</a> · Ideas diarias.</li>
          <li><a routerLink="/seccion/la-asociacion">La Asociación</a> · Cultura y sociedad.</li>
          <li><a routerLink="/seccion/la-comunidad">La Comunidad</a> · Participación.</li>
          <li><a routerLink="/encuestas">Encuestas</a> · Preguntas abiertas a los lectores. El voto es anónimo.</li>
          <li><a routerLink="/tablon">El Tablón</a> · Convocatorias, encuentros, lecturas y propuestas.</li>
        </ul>

        <h2>Cómo trabajamos</h2>
        <p>
          Cada texto va firmado por su autor y con su fecha de publicación. Seguimos los criterios de redacción del texto
          fundacional: fundamentar cada análisis, distinguir los hechos de las interpretaciones y de las posiciones editoriales,
          contextualizar y argumentar sin sustituir el razonamiento por consignas.
        </p>

        <h2>Editores</h2>
        <div class="editors">
          @for (e of editors; track e.id) {
            <section class="editor" [id]="e.id">
              <h3>{{ e.name }}</h3>
              <p>Editor y cofundador de LA ACCIÓN.</p>
            </section>
          }
        </div>

        <h2>Contacto</h2>
        <p>
          Escríbenos a <a [href]="'mailto:' + email">{{ email }}</a>. Los datos del titular están en el
          <a routerLink="/aviso-legal">aviso legal</a>.
        </p>
      </div>
    </article>
  `,
})
export class AboutPage {
  protected readonly editors = EDITORS;
  protected readonly email = CONTACT_EMAIL;

  constructor() {
    inject(SeoService).set({
      title: 'Quiénes somos',
      description: `Qué es ${SITE_NAME}, quién la edita y cómo trabajamos: un periódico independiente de pensamiento, cultura y democracia.`,
      path: '/quienes-somos',
      jsonLd: [
        {
          '@type': 'AboutPage',
          '@id': absoluteUrl('/quienes-somos'),
          url: absoluteUrl('/quienes-somos'),
          name: `Quiénes somos — ${SITE_NAME}`,
          inLanguage: 'es-ES',
          isPartOf: { '@id': WEBSITE_ID },
          about: { '@id': ORG_ID },
          mainEntity: { '@id': ORG_ID },
        },
        organizationNode(),
        ...EDITORS.map((e) => ({
          '@type': 'Person',
          '@id': absoluteUrl(`/quienes-somos#${e.id}`),
          name: e.name,
          url: absoluteUrl(`/quienes-somos#${e.id}`),
          jobTitle: 'Editor',
          worksFor: { '@id': ORG_ID },
        })),
        breadcrumbNode([
          { name: 'Portada', path: '/' },
          { name: 'Quiénes somos', path: '/quienes-somos' },
        ]),
      ],
    });
  }
}
