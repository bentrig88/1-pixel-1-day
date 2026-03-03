// ─────────────────────────────────────────────────────────────────────────────
// THEME DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
// To add a new theme: add an entry to the THEMES array below.
// Each variable name is semantic (describes the role, not the color value).
//
// Variable reference:
//   --theme-bg                  App / page background
//   --theme-grid-cell           Background pixel grid cells
//   --theme-pixel-past          Past day pixels
//   --theme-pixel-today         Today's pixel + accent color (labels, branding)
//   --theme-pixel-future        Future day pixels
//   --theme-pixel-past-hover    Edit-mode hover on past pixels
//   --theme-pixel-today-hover   Edit-mode hover on today pixel
//   --theme-pixel-future-hover  Edit-mode hover on future pixels
//   --theme-bar-bg              Top / bottom bar background
//   --theme-bar-text            Bar primary text
//   --theme-bar-muted           Bar secondary / muted text
//   --theme-surface             Light areas: dropdowns, label backgrounds
//   --theme-surface-hover       Hover state on surface items
//   --theme-surface-text        Text on surface
//   --theme-panel-bg            Dark overlay panel (save popup, edit buttons)
//   --theme-panel-text          Text on panel
//   --theme-label-idle          Month / week labels (non-current period)
//   --theme-divider             Divider / separator lines
// ─────────────────────────────────────────────────────────────────────────────

export interface Theme {
  id: string
  name: string
  vars: Record<string, string>
}

export const THEMES: Theme[] = [
  {
    id: 'retro',
    name: 'Retro',
    vars: {
      '--theme-bg':                  '#e8e8e8',
      '--theme-grid-cell':           '#f0f0f0',
      '--theme-pixel-past':          '#b0b0b0',
      '--theme-pixel-today':         '#cc2200',
      '--theme-pixel-future':        '#2a2a2a',
      '--theme-pixel-past-hover':    '#c8c8c8',
      '--theme-pixel-today-hover':   '#e03818',
      '--theme-pixel-future-hover':  '#484848',
      '--theme-bar-bg':              '#1a1a1a',
      '--theme-bar-text':            '#cccccc',
      '--theme-bar-muted':           '#999999',
      '--theme-surface':             '#ffffff',
      '--theme-surface-hover':       '#f0f0f0',
      '--theme-surface-text':        '#1a1a1a',
      '--theme-panel-bg':            '#2a2a2a',
      '--theme-panel-text':          '#ffffff',
      '--theme-label-idle':          '#888888',
      '--theme-divider':             '#e0e0e0',
    },
  },

   {
    id: 'dark',
    name: 'Dark',
    vars: {
      '--theme-bg':                  '#000000',
      '--theme-grid-cell':           '#0B0B0B',
      '--theme-pixel-past':          '#3F3D33',
      '--theme-pixel-today':         '#FFE100',
      '--theme-pixel-future':        '#E7E7E7',
      '--theme-pixel-past-hover':    '#4F4C3D',
      '--theme-pixel-today-hover':   '#FFEE6E',
      '--theme-pixel-future-hover':  '#FFFFFF',
      '--theme-bar-bg':              '#1a1a1a',
      '--theme-bar-text':            '#cccccc',
      '--theme-bar-muted':           '#999999',
      '--theme-surface':             '#000000',
      '--theme-surface-hover':       '#0B0B0B',
      '--theme-surface-text':        '#ffffff',
      '--theme-panel-bg':            '#2a2a2a',
      '--theme-panel-text':          '#ffffff',
      '--theme-label-idle':          '#888888',
      '--theme-divider':             '#e0e0e0',
    },
  },
  // ── Add new themes here ───────────────────────────────────────────────────
  // {
  //   id: 'dark',
  //   name: 'Dark',
  //   vars: {
  //     '--theme-bg':           '#111111',
  //     '--theme-grid-cell':    '#1c1c1c',
  //     // ... fill in all variables above
  //   },
  // },
]

export const DEFAULT_THEME_ID = 'retro'

export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  for (const [key, val] of Object.entries(theme.vars)) {
    root.style.setProperty(key, val)
  }
}
