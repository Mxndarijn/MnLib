import { MnConfigService } from '../config/mn-config.service';
import { MnLanguageService } from '../language/mn-language.service';

/** What the editor posts into the previewed site. */
export type MnPreviewMessage = {
  type: 'mn-config-update' | 'mn-translations-update' | 'mn-preview-edit-mode';
  config?: Record<string, unknown>;
  translations?: Record<string, Record<string, string>>;
  /** For `mn-preview-edit-mode`: whether clicks pick content instead of following links. */
  enabled?: boolean;
}

/**
 * What the previewed site posts to the editor.
 *
 * - `mn-preview-ready`: the listener is registered, so content posted from now on arrives (a
 *   message sent earlier is lost). Sent once, and again after every page change.
 * - `mn-preview-select`: in edit mode, the visitor clicked a text or an image. `text` is the text
 *   under the pointer (whitespace collapsed), `context` the whole text of the element around it;
 *   for an image, `src` is the URL the page asked for. The editor works out which key or config
 *   value that is: the site only knows what it rendered.
 */
export type MnPreviewEvent =
  | { type: 'mn-preview-ready'; locale: string; path: string }
  | { type: 'mn-preview-select'; kind: 'text'; text: string; context: string; locale: string; path: string }
  | { type: 'mn-preview-select'; kind: 'image'; src: string; alt: string; locale: string; path: string };

/** The outline shown on what a click would pick. */
const HOVER_ATTR = 'data-mn-preview-hover';
const STYLE_ID = 'mn-preview-edit-style';
/** How far up from the element under the pointer a text is looked for. */
const MAX_TEXT_DEPTH = 4;

/**
 * Enable live preview mode. Listens for postMessage events from
 * Mn Web Manager and hot-swaps config/translations at runtime.
 *
 * Call this once in your app's bootstrap (e.g., APP_INITIALIZER or root component), in the
 * browser only and only inside a frame.
 *
 * Besides swapping content it tells the editor when it is ready (`mn-preview-ready`), and in edit
 * mode (`mn-preview-edit-mode`) it outlines the text or image under the pointer and reports a
 * click on it (`mn-preview-select`) instead of following it, so the owner can click what they want
 * to change.
 *
 * @param configService - The MnConfigService instance
 * @param langService - The MnLanguageService instance
 * @param allowedOrigins - The editor origins that may change this frame's content. Give at least
 *   one: with none, any page that frames the site may rewrite it in that frame, and the site's own
 *   messages go to any parent.
 */
export function enableMnPreviewMode(
  configService: MnConfigService,
  langService: MnLanguageService,
  allowedOrigins?: string[]
): void {
  const origins = allowedOrigins?.length ? allowedOrigins : null;
  /** The editor that switched edit mode on; selections go back to it alone. */
  let editorOrigin: string | null = null;

  const post = (message: MnPreviewEvent, origin?: string | null) => {
    if (window.parent === window) return;
    // To each allowed origin: the browser drops it for every origin that isn't the parent's.
    for (const target of origin ? [origin] : (origins ?? ['*'])) {
      window.parent.postMessage(message, target);
    }
  };
  const where = () => ({ locale: langService.locale, path: location.pathname });

  window.addEventListener('message', async (event: MessageEvent<MnPreviewMessage>) => {
    if (origins && !origins.includes(event.origin)) {
      return;
    }

    const data = event.data;
    if (!data?.type) return;

    switch (data.type) {
      case 'mn-config-update':
        if (data.config) {
          await configService.loadFromObject(data.config);
        }
        break;

      case 'mn-translations-update':
        if (data.translations) {
          for (const [locale, translations] of Object.entries(data.translations)) {
            langService.registerTranslations(locale, translations);
          }
          await langService.setLocale(langService.locale);
        }
        break;

      case 'mn-preview-edit-mode':
        editorOrigin = event.origin && event.origin !== 'null' ? event.origin : null;
        setEditMode(!!data.enabled, selection => post({ ...selection, ...where() } as MnPreviewEvent, editorOrigin));
        break;
    }
  });

  post({ type: 'mn-preview-ready', ...where() });
  // A single-page app changes pages without loading one; tell the editor, which posts the draft
  // again and keeps its address bar in step.
  let lastPath = location.pathname;
  const onNavigate = () => {
    if (location.pathname === lastPath) return;
    lastPath = location.pathname;
    post({ type: 'mn-preview-ready', ...where() });
  };
  window.addEventListener('popstate', onNavigate);
  for (const method of ['pushState', 'replaceState'] as const) {
    const original = history[method].bind(history);
    history[method] = (...args: Parameters<History['pushState']>) => {
      original(...args);
      onNavigate();
    };
  }
}

type Selection =
  | { type: 'mn-preview-select'; kind: 'text'; text: string; context: string }
  | { type: 'mn-preview-select'; kind: 'image'; src: string; alt: string };

let editListeners: { over: (e: MouseEvent) => void; click: (e: MouseEvent) => void } | null = null;

/** Switches edit mode on or off; `report` receives every pick. */
function setEditMode(enabled: boolean, report: (selection: Selection) => void): void {
  if (editListeners) {
    document.removeEventListener('mouseover', editListeners.over, true);
    document.removeEventListener('click', editListeners.click, true);
    editListeners = null;
  }
  document.querySelectorAll(`[${HOVER_ATTR}]`).forEach(el => el.removeAttribute(HOVER_ATTR));
  document.getElementById(STYLE_ID)?.remove();
  if (!enabled) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent =
    `[${HOVER_ATTR}]{outline:2px dashed #0ea5e9 !important;outline-offset:2px !important;cursor:pointer !important}`;
  document.head.appendChild(style);

  let hovered: Element | null = null;
  const over = (e: MouseEvent) => {
    const target = pickTarget(e.target);
    if (target === hovered) return;
    hovered?.removeAttribute(HOVER_ATTR);
    hovered = target;
    hovered?.setAttribute(HOVER_ATTR, '');
  };
  const click = (e: MouseEvent) => {
    const selection = describe(e);
    if (!selection) return;
    // The owner is picking what to edit: a link or button must not act.
    e.preventDefault();
    e.stopPropagation();
    report(selection);
  };
  document.addEventListener('mouseover', over, true);
  document.addEventListener('click', click, true);
  editListeners = { over, click };
}

/** The element a click at `target` would pick: an image, or the nearest element with text of its own. */
function pickTarget(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null;
  if (imageSource(target)) return target;
  let el: Element | null = target;
  for (let depth = 0; el && depth < MAX_TEXT_DEPTH; depth++, el = el.parentElement) {
    if (ownText(el)) return el;
  }
  return null;
}

function describe(e: MouseEvent): Selection | null {
  const target = pickTarget(e.target);
  if (!target) return null;
  const src = imageSource(target);
  if (src) {
    return { type: 'mn-preview-select', kind: 'image', src, alt: target.getAttribute('alt') ?? '' };
  }
  const text = textAtPoint(e.clientX, e.clientY, target) || ownText(target);
  const context = collapse((target as HTMLElement).innerText ?? target.textContent ?? '').slice(0, 1000);
  return text ? { type: 'mn-preview-select', kind: 'text', text, context } : null;
}

/** An `<img>`'s source, or a `background-image` URL; '' for anything else. */
function imageSource(el: Element): string {
  if (el instanceof HTMLImageElement) return el.getAttribute('src') || el.currentSrc || el.src;
  const bg = getComputedStyle(el).backgroundImage;
  const match = /url\(["']?(.*?)["']?\)/.exec(bg ?? '');
  return match?.[1] ?? '';
}

/** The element's own text, not its children's. */
function ownText(el: Element): string {
  let text = '';
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) text += node.textContent ?? '';
  }
  return collapse(text);
}

/** The text node right under the pointer, when it lies inside `within`. */
function textAtPoint(x: number, y: number, within: Element): string {
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  const node = doc.caretPositionFromPoint?.(x, y)?.offsetNode ?? doc.caretRangeFromPoint?.(x, y)?.startContainer;
  if (!node || node.nodeType !== Node.TEXT_NODE || !within.contains(node)) return '';
  return collapse(node.textContent ?? '');
}

function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
