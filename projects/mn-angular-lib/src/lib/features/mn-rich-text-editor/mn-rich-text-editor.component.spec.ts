import {Component, signal} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import Quill from 'quill';

import {MnRichTextEditor} from './mn-rich-text-editor.component';
import {MnRichTextEditorLabels} from './mn-rich-text-editor.types';
import {MnLanguageService} from '../../language';

/** Host that drives the editor the way a page would. */
@Component({
  standalone: true,
  imports: [MnRichTextEditor],
  template: `
    <mn-rich-text-editor
      [content]="content()"
      [placeholder]="placeholder"
      [ariaLabel]="ariaLabel"
      [labels]="labels"
      [labelKeys]="labelKeys"
      (contentChange)="onContentChange($event)">
    </mn-rich-text-editor>
  `,
})
class HostComponent {
  /** Content pushed into the editor. */
  content = signal<string>('');
  /** Placeholder shown while empty. */
  placeholder = '';
  /** Accessible name for the writing surface. */
  ariaLabel = '';
  /** Literal toolbar labels. */
  labels: MnRichTextEditorLabels = {};
  /** Key-based toolbar labels. */
  labelKeys: MnRichTextEditorLabels = {};
  /** Everything the editor has emitted, in order. */
  emitted: string[] = [];

  /**
   * Records an emission, mirroring a page that stores the draft.
   * @param html The HTML the editor emitted.
   */
  onContentChange(html: string): void {
    this.emitted.push(html);
    this.content.set(html);
  }
}

describe('MnRichTextEditor', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  /**
   * Renders the host and waits for the editor to mount: it is created in
   * `afterNextRender`, which then loads Quill through a dynamic import, so the
   * surface only exists a few turns after the first render.
   */
  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    for (let attempt = 0; attempt < 100; attempt++) {
      if (fixture.nativeElement.querySelector('.ql-container')) break;
      await new Promise((resolve) => setTimeout(resolve, 10));
      fixture.detectChanges();
    }
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /**
   * Reaches the live Quill instance the component created.
   * @returns The editor instance mounted inside the fixture.
   */
  function editor(): Quill {
    const container = fixture.nativeElement.querySelector('.ql-container') as HTMLElement;
    return Quill.find(container) as Quill;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  it('mounts a toolbar and a writing surface', async () => {
    host.ariaLabel = 'Minutes';
    host.placeholder = 'Write the minutes';
    await render();

    const surface = fixture.nativeElement.querySelector('.ql-editor') as HTMLElement;
    expect(fixture.nativeElement.querySelector('.ql-toolbar')).toBeTruthy();
    expect(surface.getAttribute('aria-label')).toBe('Minutes');
    expect(surface.getAttribute('data-placeholder')).toBe('Write the minutes');
  });

  it('seeds the editor with the initial content', async () => {
    host.content.set('<p>Opening remarks</p>');
    await render();

    expect(editor().getText().trim()).toBe('Opening remarks');
  });

  it('emits the edited HTML', async () => {
    await render();

    editor().setText('Attendance noted\n');

    expect(host.emitted.length).toBe(1);
    expect(host.emitted[0]).toContain('Attendance noted');
  });

  it('reports an untouched editor as empty rather than as Quill blank markup', async () => {
    host.content.set('<p>Something</p>');
    await render();

    editor().setText('');

    expect(host.emitted[host.emitted.length - 1]).toBe('');
  });

  it('does not re-seed when the parent echoes the emitted value back', async () => {
    await render();

    // The host writes every emission back into `content`, the pattern that would
    // wipe the user's typing if the seeding effect tracked its own last emission.
    editor().setText('First line\n');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(editor().getText().trim()).toBe('First line');
    expect(host.emitted.length).toBe(1);
  });

  it('re-seeds when the parent supplies genuinely new content', async () => {
    await render();

    host.content.set('<p>Seeded from the agenda</p>');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(editor().getText().trim()).toBe('Seeded from the agenda');
  });

  it('labels the toolbar in English when no labels are supplied', async () => {
    await render();

    const bold = fixture.nativeElement.querySelector('button.ql-bold') as HTMLElement;
    expect(bold.classList).toContain('mn-rte-tooltip');
    expect(bold.getAttribute('data-tip')).toBe('Bold');
  });

  it('prefers a translated key, then a literal label, over the default', async () => {
    const lang = TestBed.inject(MnLanguageService);
    lang.registerTranslations('en', {'editor.bold': 'Vet'});
    host.labelKeys = {bold: 'editor.bold', italic: 'editor.missing'};
    host.labels = {italic: 'Schuin', link: 'Koppeling'};
    await render();

    const tip = (selector: string): string | null =>
      (fixture.nativeElement.querySelector(selector) as HTMLElement).getAttribute('data-tip');

    expect(tip('button.ql-bold')).toBe('Vet');
    // Key with no translation falls through to the literal label...
    expect(tip('button.ql-italic')).toBe('Schuin');
    // ...a literal label alone is used as-is...
    expect(tip('button.ql-link')).toBe('Koppeling');
    // ...and anything unlabelled keeps the built-in default.
    expect(tip('button.ql-underline')).toBe('Underline');
  });
});
