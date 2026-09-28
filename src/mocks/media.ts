/**
 * Placeholder imagery for the mock dataset.
 *
 * The real system stores photo *references* and serves the binary from a
 * Render persistent disk (Technical Specification 7.3.3). Until that exists,
 * these deterministic SVG data URIs stand in so every screen that depends on a
 * student photo or a bike photo can be demonstrated.
 */

const COLOUR_HEX: Record<string, string> = {
  black: '#23262F',
  'matte black': '#2F3239',
  white: '#E9EBF0',
  silver: '#B9BFCB',
  grey: '#8A91A0',
  gray: '#8A91A0',
  blue: '#2A62C9',
  navy: '#1D3A72',
  red: '#B8322B',
  green: '#2C7A52',
  yellow: '#D8A521',
  orange: '#D2762A',
  purple: '#5A2D82',
  teal: '#2A7E86',
};

export function colourToHex(colour: string): string {
  return COLOUR_HEX[colour.trim().toLowerCase()] ?? '#4A5570';
}

function encode(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}`;
}

/** Avatar tile with the person's initials, tinted deterministically by name. */
export function avatarFor(name: string): string {
  const tints = ['#1F5EFF', '#5A2D82', '#127A4B', '#B26A00', '#2B3A63', '#2A7E86'];
  const seed = [...name].reduce((total, char) => total + char.charCodeAt(0), 0);
  const tint = tints[seed % tints.length];
  const letters = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  return encode(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
      <rect width="160" height="160" fill="${tint}"/>
      <rect width="160" height="160" fill="url(#g)" opacity="0.35"/>
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ffffff" stop-opacity="0.5"/>
          <stop offset="1" stop-color="#000000" stop-opacity="0.3"/>
        </linearGradient>
      </defs>
      <text x="80" y="80" font-family="Barlow, sans-serif" font-size="62" font-weight="600"
        fill="#ffffff" text-anchor="middle" dominant-baseline="central">${letters}</text>
    </svg>
  `);
}

/** Side-on bicycle illustration in the registered frame colour. */
export function bikePhotoFor(colour: string, label: string): string {
  const frame = colourToHex(colour);
  return encode(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200">
      <rect width="320" height="200" fill="#EFF2F8"/>
      <rect y="150" width="320" height="50" fill="#E2E7F1"/>
      <g fill="none" stroke="#39405A" stroke-width="5" stroke-linecap="round">
        <circle cx="82" cy="136" r="38"/>
        <circle cx="238" cy="136" r="38"/>
      </g>
      <g fill="none" stroke="${frame}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">
        <path d="M82 136 L136 76 L196 76 L238 136"/>
        <path d="M136 76 L168 136 L238 136"/>
        <path d="M168 136 L82 136"/>
        <path d="M196 76 L206 56"/>
      </g>
      <path d="M126 68 L154 68" stroke="#39405A" stroke-width="8" stroke-linecap="round"/>
      <path d="M196 52 L224 52" stroke="#39405A" stroke-width="8" stroke-linecap="round"/>
      <circle cx="168" cy="136" r="10" fill="#39405A"/>
      <text x="16" y="28" font-family="Barlow, sans-serif" font-size="16" font-weight="600"
        fill="#5A6A93">${label}</text>
    </svg>
  `);
}
