import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  signal,
  untracked,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import type Quill from 'quill';
import {MnLanguageService} from '../../language';
import {MnRichTextEditorControl, MnRichTextEditorLabels, MnRichTextEditorToolbar,} from './mn-rich-text-editor.types';

/**
 * Toolbar the editor renders when the consumer does not supply one. Deliberately
 * small: it covers written prose, so there is no colour picker, no font picker
 * and no image embedding (an image needs an upload and storage path the editor
 * knows nothing about).
 */
const DEFAULT_TOOLBAR: MnRichTextEditorToolbar = [
  [{header: [2, 3, false]}],
  ['bold', 'italic', 'underline', 'strike'],
  [{list: 'ordered'}, {list: 'bullet'}],
  ['blockquote', 'code-block'],
  ['link'],
  ['clean'],
];

/** Where each control sits in the toolbar Quill builds. */
const CONTROL_SELECTORS: Record<MnRichTextEditorControl, string> = {
  textStyle: '.ql-header .ql-picker-label',
  bold: 'button.ql-bold',
  italic: 'button.ql-italic',
  underline: 'button.ql-underline',
  strike: 'button.ql-strike',
  orderedList: 'button.ql-list[value="ordered"]',
  bulletList: 'button.ql-list[value="bullet"]',
  blockquote: 'button.ql-blockquote',
  codeBlock: 'button.ql-code-block',
  link: 'button.ql-link',
  clean: 'button.ql-clean',
};

/** Hover labels used when the consumer supplies neither a label nor a key. */
const DEFAULT_LABELS: Record<MnRichTextEditorControl, string> = {
  textStyle: 'Text style',
  bold: 'Bold',
  italic: 'Italic',
  underline: 'Underline',
  strike: 'Strikethrough',
  orderedList: 'Numbered list',
  bulletList: 'Bulleted list',
  blockquote: 'Quote',
  codeBlock: 'Code block',
  link: 'Link',
  clean: 'Clear formatting',
};

/** Quill's document when it holds no text; treated as an empty value. */
const EMPTY_DOCUMENT = '<p><br></p>';

/**
 * Thin wrapper around the {@link Quill} rich-text editor.
 *
 * Quill is used **directly** rather than through an Angular wrapper package: the
 * wrapper libraries carry peer-dependency ranges that lag behind Angular's
 * release train, and none of them add anything this component needs.
 *
 * Consumers must install `quill` themselves (it is an optional peer dependency)
 * and load its snow theme, e.g. `node_modules/quill/dist/quill.snow.css` in the
 * `styles` array of `angular.json`. Only the chrome around that theme — radius,
 * borders, height limits and the toolbar tooltips — belongs to this component;
 * recolouring Quill's own palette to an app theme stays with the app, because
 * the same `.ql-snow` markup is normally reused to render stored HTML in places
 * where no editor is mounted.
 *
 * Quill itself is pulled in with a dynamic `import()` when the editor mounts.
 * This component sits in the library's single entry point, which apps import
 * eagerly, so a static import would put the whole editor engine in every app's
 * initial bundle — including the pages that never open one.
 *
 * Zoneless notes: nothing here relies on an implicit change-detection tick. The
 * editor is created inside {@link afterNextRender} (the host element only exists
 * after the first render pass) and every value that flows back out is written to
 * a signal or emitted through an `output`, both of which schedule change
 * detection themselves. No `setTimeout`, no manual `detectChanges`.
 *
 * The produced HTML is **not** trusted: sanitise it before rendering it anywhere.
 *
 * @example
 * ```html
 * <mn-rich-text-editor
 *   [content]="draft()"
 *   [placeholder]="'minutes.placeholder' | mnTranslate"
 *   [labelKeys]="{ bold: 'editor.bold', italic: 'editor.italic' }"
 *   (contentChange)="draft.set($event)">
 * </mn-rich-text-editor>
 * ```
 */
@Component({
  selector: 'mn-rich-text-editor',
  standalone: true,
  templateUrl: './mn-rich-text-editor.component.html',
  styleUrl: './mn-rich-text-editor.component.css',
  // Quill builds its DOM at runtime, so those elements never carry Angular's
  // scoping attribute and an encapsulated stylesheet could never reach them.
  // Every rule in the stylesheet is scoped by `.mn-rich-text-editor` instead.
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MnRichTextEditor implements OnDestroy {
  /**
   * The initial HTML content. Later changes are applied only when they differ
   * from what the editor currently holds, so a parent echoing the emitted value
   * back never moves the caret.
   */
  public readonly content = input<string>('');
  /** Placeholder shown while the editor is empty. */
  public readonly placeholder = input<string>('');
  /** Accessible label for the editing surface. */
  public readonly ariaLabel = input<string>('');
  /** Toolbar layout, in Quill's own format. Defaults to a prose-oriented set. */
  public readonly toolbar = input<MnRichTextEditorToolbar>(DEFAULT_TOOLBAR);
  /** Literal hover labels per toolbar control. */
  public readonly labels = input<MnRichTextEditorLabels>({});
  /** Translation keys per toolbar control; takes precedence over `labels`. */
  public readonly labelKeys = input<MnRichTextEditorLabels>({});
  /**
   * Utilities applied to the wrapper, for sizing the writing surface. Overriding
   * this replaces the default height limits, so pass both bounds when you do.
   */
  public readonly editorClass = input<string>(
    '[&_.ql-editor]:max-h-104 [&_.ql-editor]:min-h-72 [&_.ql-editor]:overflow-y-auto',
  );
  /** Emits the editor's HTML on every user edit. */
  public readonly contentChange = output<string>();
  /**
   * Chrome around Quill's snow theme: the field's radius, border and surface.
   *
   * Descendant variants rather than a stylesheet — the utilities come from the
   * consuming app's Tailwind build (which scans this bundle), so they follow the
   * app's theme tokens the same way the rest of the library does.
   */
  protected readonly chromeClass =
    '[&_.ql-container.ql-snow]:rounded-b-xl [&_.ql-container.ql-snow]:border-base-300 ' +
    '[&_.ql-container.ql-snow]:bg-base-100 [&_.ql-container.ql-snow]:text-base ' +
    '[&_.ql-toolbar.ql-snow]:rounded-t-xl [&_.ql-toolbar.ql-snow]:border-base-300 ' +
    '[&_.ql-toolbar.ql-snow]:bg-base-100';
  /** Host element, used to keep DOM queries inside this component. */
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  /** Language service, used to resolve the toolbar labels from keys. */
  private readonly lang = inject(MnLanguageService);
  /** The container Quill mounts into. */
  private readonly editorHost = viewChild.required<ElementRef<HTMLElement>>('editorHost');
  /** The live editor instance, or null before Quill has loaded. */
  private quill: Quill | null = null;

  /** Whether the component is gone, so a late Quill load knows to stop. */
  private destroyed = false;

  /** The last HTML this component emitted, used to skip redundant writes. */
  private readonly lastEmitted = signal<string>('');

  constructor() {
    afterNextRender(() => void this.createEditor());
    // Push a changed `content` input into a live editor. `lastEmitted` is read
    // `untracked` on purpose: it must gate the write (skip when the incoming HTML
    // already matches what we hold) WITHOUT making the effect depend on it. If it
    // were tracked, every keystroke (which updates `lastEmitted`) would re-run the
    // effect and re-paste the now-stale `content` seed — wiping the user's typing
    // and resetting the caret after any wholesale reseed.
    effect(() => {
      const incoming = this.content();
      if (!this.quill || incoming === untracked(this.lastEmitted)) return;
      this.setEditorHtml(incoming);
    });
  }

  /** Drops the editor reference so the instance can be garbage collected. */
  ngOnDestroy(): void {
    this.destroyed = true;
    this.quill = null;
  }

  /** Moves focus into the editing surface. */
  public focusEditor(): void {
    this.quill?.focus();
    if (!this.quill) {
      this.host.nativeElement.querySelector<HTMLElement>('.ql-editor')?.focus();
    }
  }

  /**
   * Loads Quill, builds the instance and wires its change handler.
   *
   * Nothing awaits this beyond the component itself: the surface appears once
   * the engine has loaded, and until then the `content` effect is a no-op that
   * the seeding below makes good.
   */
  private async createEditor(): Promise<void> {
    const {default: QuillEditor} = await import('quill');
    if (this.destroyed) return;
    const container = this.editorHost().nativeElement;
    this.quill = new QuillEditor(container, {
      theme: 'snow',
      placeholder: this.placeholder(),
      modules: {toolbar: this.toolbar() as unknown[]},
    });
    const label = this.ariaLabel();
    if (label) {
      this.quill.root.setAttribute('aria-label', label);
    }
    this.applyToolbarLabels();
    this.setEditorHtml(this.content());
    this.quill.on('text-change', () => this.emitCurrentHtml());
  }

  /**
   * Gives each toolbar control a hover label, so hovering explains what the
   * style does. Set on the Quill-generated DOM after init; a control the current
   * toolbar does not render is simply skipped.
   */
  private applyToolbarLabels(): void {
    const toolbar = this.host.nativeElement.querySelector('.ql-toolbar');
    if (!toolbar) return;
    const labels = this.labels();
    const keys = this.labelKeys();
    for (const [control, selector] of Object.entries(CONTROL_SELECTORS)) {
      const element = toolbar.querySelector(selector);
      if (!element) continue;
      element.classList.add('mn-rte-tooltip');
      element.setAttribute(
        'data-tip',
        this.resolveLabel(control as MnRichTextEditorControl, labels, keys),
      );
    }
  }

  /**
   * Picks the hover label for one control.
   * @param control The control being labelled.
   * @param labels Literal labels supplied by the consumer.
   * @param keys Translation keys supplied by the consumer.
   * @returns The translated key, the literal label, or the built-in default.
   */
  private resolveLabel(
    control: MnRichTextEditorControl,
    labels: MnRichTextEditorLabels,
    keys: MnRichTextEditorLabels,
  ): string {
    const key = keys[control];
    if (key) {
      // `t()` echoes the key back when the consumer has no translation for it;
      // that is a miss, not a label, so fall through to the remaining sources.
      const translated = this.lang.t(key);
      if (translated !== key) return translated;
    }
    return labels[control] ?? DEFAULT_LABELS[control];
  }

  /**
   * Replaces the editor content with stored HTML. Quill parses it into its own
   * document model, which silently drops anything it has no format for — a
   * useful extra filter on top of the consumer's sanitiser.
   * @param html The HTML to load into the editor.
   */
  private setEditorHtml(html: string): void {
    if (!this.quill) return;
    // `dangerouslyPasteHTML` is Quill's documented name for "parse this HTML".
    this.quill.clipboard.dangerouslyPasteHTML(html ?? '', 'silent');
    this.lastEmitted.set(this.readHtml());
  }

  /** Emits the editor's current HTML, normalising Quill's "empty" document. */
  private emitCurrentHtml(): void {
    const html = this.readHtml();
    this.lastEmitted.set(html);
    this.contentChange.emit(html);
  }

  /**
   * Reads the editor's HTML.
   * @returns The current HTML, or an empty string when the editor is blank.
   */
  private readHtml(): string {
    if (!this.quill) return '';
    // Quill leaves an empty paragraph behind after a clear; treat that as empty
    // so an untouched editor does not count as authored content.
    const html = this.quill.root.innerHTML;
    return html === EMPTY_DOCUMENT ? '' : html;
  }
}
