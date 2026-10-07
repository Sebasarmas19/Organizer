/* Organizer · Los colores de la app, en un solo sitio.

   Lo leen el layout (theme-color), el manifiesto, <ThemeColorSync> y los
   selectores de Apariencia y Color. El fondo de cada color tiene que
   coincidir con `--io-bg` de ios.css para ese `data-accent`: si uno cambia y
   el otro no, aparece una franja de otro tono bajo la barra de estado. */

export type AccentId = 'ciruela' | 'bosque' | 'petroleo' | 'indigo' | 'grafito';

export type Accent = {
  id: AccentId;
  label: string;
  /** El relleno del color en claro: la muestra del selector. */
  swatch: string;
  bg: { light: string; dark: string };
};

/** El primero es el de la app si no eliges otro (Bosque, 2026-10-06).
    Ciruela es la base de ios.css: el unico color sin `data-accent`. */
export const ACCENTS: Accent[] = [
  { id: 'bosque', label: 'Bosque', swatch: '#2F6B52', bg: { light: '#F4F2EC', dark: '#0E1210' } },
  { id: 'ciruela', label: 'Ciruela', swatch: '#7B3F6E', bg: { light: '#F5F1F0', dark: '#120D11' } },
  { id: 'petroleo', label: 'Petróleo', swatch: '#1D6475', bg: { light: '#F1F4F4', dark: '#0B1213' } },
  { id: 'indigo', label: 'Índigo', swatch: '#4540B5', bg: { light: '#F3F3F8', dark: '#0E0E14' } },
  { id: 'grafito', label: 'Grafito', swatch: '#1C1C1E', bg: { light: '#F2F2F4', dark: '#000000' } },
];

export const ACCENT_KEY = 'organizer:accent';

export const THEME_BG = ACCENTS[0].bg;

export function accentOf(id: string | null | undefined): Accent {
  return ACCENTS.find((a) => a.id === id) ?? ACCENTS[0];
}

/** El fondo del color que tiene puesto la pagina ahora mismo. */
export function currentBg(): { light: string; dark: string } {
  return accentOf(document.documentElement.getAttribute('data-accent') ?? 'ciruela').bg;
}
