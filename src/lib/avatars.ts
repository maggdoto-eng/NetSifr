/** Fixed palette a participant picks from at onboarding — User.avatarKey indexes into this. */
export const AVATARS: Array<{ glyph: string; bg: string; fg: string }> = [
  { glyph: '●', bg: '#86E5BC', fg: '#123B2E' },
  { glyph: '■', bg: '#FF6A45', fg: '#FFF7F2' },
  { glyph: '▲', bg: '#123B2E', fg: '#86E5BC' },
  { glyph: '◆', bg: '#E3D9C2', fg: '#123B2E' },
  { glyph: '✦', bg: '#123B2E', fg: '#FF6A45' },
  { glyph: '◈', bg: '#86E5BC', fg: '#FF6A45' },
  { glyph: '❋', bg: '#FF6A45', fg: '#FFF7F2' },
  { glyph: '◉', bg: '#E3D9C2', fg: '#10241E' },
];

export function avatarFor(avatarKey: number) {
  return AVATARS[avatarKey] ?? AVATARS[0];
}
