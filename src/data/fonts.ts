// ─────────────────────────────────────────────────────────────────────────────
// FONT DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
// To add a new font:
//   1. Add a <link> for it in index.html (Google Fonts or self-hosted)
//   2. Add an entry to the FONTS array below
// ─────────────────────────────────────────────────────────────────────────────

export interface AppFont {
  id: string
  name: string
  family: string  // CSS font-family value assigned to --font-mono
}

export const FONTS: AppFont[] = [
  { id: 'pixelify',   name: 'Pixelify Sans', family: "'Pixelify Sans', monospace" },
  { id: 'bytesized',  name: 'Bytesized',    family: "'Bytesized', monospace" },
  { id: 'jersey10',   name: 'Jersey 10',    family: "'Jersey 10', monospace" },
  { id: 'jacquard24', name: 'Jacquard 24',  family: "'Jacquard 24', monospace" },
  // ── Add new fonts here ────────────────────────────────────────────────────
]

export const DEFAULT_FONT_ID = 'pixelify'

export function applyFont(font: AppFont): void {
  document.documentElement.style.setProperty('--font-mono', font.family)
}
