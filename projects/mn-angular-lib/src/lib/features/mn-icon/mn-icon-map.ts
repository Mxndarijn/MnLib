// Custom SVGs that are NOT available in lucide (https://lucide.dev).
// For any lucide icon, use the @lucide/angular directive directly instead —
// e.g. `<svg lucideX [size]="18"></svg>` — rather than adding it here.
// Sourced from the .svg files in the ./icons/ directory.
const pistolSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.72 14.56 9 10h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v4c2.5 0 1 4 1 4-4 6-1 6-1 6h3.38a1 1 0 0 0 .89-.55za1 1 0 0 1 .9-.56H13a2 2 0 0 0 2-2v-1a1 1 0 0 1 1-1" /></svg>`;

export const MN_ICON_MAP: Record<string, string> = {
  pistol: pistolSvg,
};
