import { isSoftKeyboardOpen, isTextEditable } from './soft-keyboard';

function fakeDoc(clientHeight: number, vv: { height: number; scale: number } | null): Document {
  return { documentElement: { clientHeight }, defaultView: { visualViewport: vv } } as unknown as Document;
}

describe('soft-keyboard', () => {
  it('reconoce los campos que abren el teclado', () => {
    const text = document.createElement('input');
    const email = Object.assign(document.createElement('input'), { type: 'email' });
    const checkbox = Object.assign(document.createElement('input'), { type: 'checkbox' });
    const readonly = Object.assign(document.createElement('input'), { readOnly: true });
    const area = document.createElement('textarea');
    const div = document.createElement('div');
    const editable = document.createElement('div');
    Object.defineProperty(editable, 'isContentEditable', { value: true });

    expect(isTextEditable(text)).toBe(true);
    expect(isTextEditable(email)).toBe(true);
    expect(isTextEditable(area)).toBe(true);
    expect(isTextEditable(editable)).toBe(true);
    expect(isTextEditable(checkbox)).toBe(false);
    expect(isTextEditable(readonly)).toBe(false);
    expect(isTextEditable(div)).toBe(false);
    expect(isTextEditable(null)).toBe(false);
  });

  it('detecta el teclado cuando encoge la parte visible y no la ventana', () => {
    expect(isSoftKeyboardOpen(fakeDoc(800, { height: 420, scale: 1 }))).toBe(true);
    expect(isSoftKeyboardOpen(fakeDoc(800, { height: 800, scale: 1 }))).toBe(false);
    // Con zoom la parte visible encoge, pero no hay teclado.
    expect(isSoftKeyboardOpen(fakeDoc(800, { height: 400, scale: 2 }))).toBe(false);
    expect(isSoftKeyboardOpen(fakeDoc(800, null))).toBe(false);
  });
});
