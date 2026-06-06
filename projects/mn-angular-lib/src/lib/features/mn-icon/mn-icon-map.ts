// TODO solve this problem that they need to be set in the file itself. (Don't know how)
const pistolSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.72 14.56 9 10h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v4c2.5 0 1 4 1 4-4 6-1 6-1 6h3.38a1 1 0 0 0 .89-.55za1 1 0 0 1 .9-.56H13a2 2 0 0 0 2-2v-1a1 1 0 0 1 1-1" /></svg>`;
const pendingSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a10 10 0 1 1 7.5-16.5l-4-.012" /><path d="M12 8.5V12l4 2" /><path d="M17.5 20.319a10 10 0 0 1-2 1.032" /><path d="M19.5 5.5v-4" /><path d="M21.365 15.5a10 10 0 0 1-1.021 2" /><path d="M21.539 9a10 10 0 0 1 .447 2.5" /></svg>`;

export const MN_ICON_MAP: Record<string, string> = {
  pistol: pistolSvg,
  pending: pendingSvg,
};
