// Inline SVGs sourced from the .svg files in the ./icons/ directory
const pistolSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.72 14.56 9 10h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v4c2.5 0 1 4 1 4-4 6-1 6-1 6h3.38a1 1 0 0 0 .89-.55za1 1 0 0 1 .9-.56H13a2 2 0 0 0 2-2v-1a1 1 0 0 1 1-1" /></svg>`;
const pendingSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7v5l4 2" /><path d="M14 20.775A9 9 0 0112 21" /><path d="M19 17.656a9 9 0 01-1.5 1.456" /><path d="M21 12a9 9 0 01-.228 2" /><path d="M21 8h-5" /><path d="M7.5 19.794c-6-3.464-6-12.124 0-15.588A9 9 0 0112 3a9.75 9.75 0 016.74 2.74L21 8V3" /></svg>`;

// Lucide icons (https://lucide.dev) — inner paths; mn-icon wraps them in a sized svg.
const imagePlusSvg = `<path d="M16 5h6" /><path d="M19 2v6" /><path d="M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /><circle cx="9" cy="9" r="2" />`;
const uploadSvg = `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />`;
const fileSvg = `<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" />`;
const trash2Svg = `<path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" />`;
const xSvg = `<path d="M18 6 6 18" /><path d="m6 6 12 12" />`;

export const MN_ICON_MAP: Record<string, string> = {
  pistol: pistolSvg,
  pending: pendingSvg,
  imagePlus: imagePlusSvg,
  upload: uploadSvg,
  file: fileSvg,
  trash2: trash2Svg,
  x: xSvg,
};
