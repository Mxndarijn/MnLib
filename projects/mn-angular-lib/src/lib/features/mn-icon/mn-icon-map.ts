// Inline SVGs sourced from the .svg files in the ./icons/ directory
const pistolSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.72 14.56 9 10h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v4c2.5 0 1 4 1 4-4 6-1 6-1 6h3.38a1 1 0 0 0 .89-.55za1 1 0 0 1 .9-.56H13a2 2 0 0 0 2-2v-1a1 1 0 0 1 1-1" /></svg>`;
const pendingSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7v5l4 2" /><path d="M14 20.775A9 9 0 0112 21" /><path d="M19 17.656a9 9 0 01-1.5 1.456" /><path d="M21 12a9 9 0 01-.228 2" /><path d="M21 8h-5" /><path d="M7.5 19.794c-6-3.464-6-12.124 0-15.588A9 9 0 0112 3a9.75 9.75 0 016.74 2.74L21 8V3" /></svg>`;

export const MN_ICON_MAP: Record<string, string> = {
  pistol: pistolSvg,
  pending: pendingSvg,
};
