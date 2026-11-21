import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { unsavedChangesGuard } from './panel.routes';

describe('unsavedChangesGuard', () => {
  let input: HTMLInputElement;

  function run(trigger: 'popstate' | 'imperative', keyboardOpen: boolean, dirty = false): boolean {
    const doc = {
      activeElement: input,
      documentElement: { clientHeight: 800 },
      defaultView: { visualViewport: { height: keyboardOpen ? 400 : 800, scale: 1 } },
    } as unknown as Document;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: DOCUMENT, useValue: doc },
        { provide: Router, useValue: { currentNavigation: () => ({ trigger }) } },
      ],
    });
    return TestBed.runInInjectionContext(
      () =>
        unsavedChangesGuard(
          { isDirty: () => dirty },
          {} as ActivatedRouteSnapshot,
          {} as RouterStateSnapshot,
          {} as RouterStateSnapshot,
        ) as boolean,
    );
  }

  beforeEach(() => {
    input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
  });

  afterEach(() => {
    input.remove();
    vi.restoreAllMocks();
  });

  it('con el teclado abierto, «atrás» solo cierra el teclado', () => {
    const blur = vi.spyOn(input, 'blur');
    expect(run('popstate', true)).toBe(false);
    expect(blur).toHaveBeenCalled();
  });

  it('sin teclado, «atrás» navega normalmente', () => {
    expect(run('popstate', false)).toBe(true);
  });

  it('un enlace o botón navega aunque haya un campo activo', () => {
    expect(run('imperative', true)).toBe(true);
  });

  it('sigue pidiendo confirmación si hay cambios sin guardar', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(run('popstate', false, true)).toBe(false);
    expect(confirm).toHaveBeenCalled();
  });
});
