import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Sol geométrico de la maqueta: ilustración por defecto cuando un artículo no tiene imagen. */
@Component({
  selector: 'app-sun-art',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  styles: `
    :host {
      display: block;
    }
    svg {
      display: block;
      width: 100%;
      height: auto;
    }
  `,
  template: `
    <svg viewBox="0 0 220 220" focusable="false">
      <circle cx="110" cy="110" r="43" fill="none" stroke="#A58C61" stroke-width="2" />
      <circle cx="110" cy="110" r="62" fill="none" stroke="#A58C61" stroke-width="1" stroke-dasharray="2 7" />
      <circle cx="110" cy="110" r="82" fill="none" stroke="#A58C61" stroke-width="1" />
      <g stroke="#792F36" stroke-width="1.5">
        <path d="M110 5V43 M110 177V215 M5 110H43 M177 110H215" />
        <path d="M36 36L63 63 M157 157L184 184 M184 36L157 63 M63 157L36 184" />
      </g>
      <g stroke="#A58C61" stroke-width="2">
        <path d="M110 18V34 M110 186V202 M18 110H34 M186 110H202" />
        <path d="M53 53L65 65 M155 155L167 167 M167 53L155 65 M65 155L53 167" />
      </g>
      <circle cx="110" cy="110" r="8" fill="#A58C61" />
    </svg>
  `,
})
export class SunArt {}
