import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { computed } from '@angular/core';
import { MnConfigService } from '../config/mn-config.service';
import { MnLanguageService } from '../language/mn-language.service';
import { enableMnPreviewMode, MnPreviewEvent } from './mn-preview-listener';

const EDITOR = 'https://editor.example';

describe('enableMnPreviewMode', () => {
  let lang: MnLanguageService;
  let config: MnConfigService;
  let posted: MnPreviewEvent[];
  let host: HTMLElement;

  const send = (data: unknown, origin = EDITOR) =>
    window.dispatchEvent(new MessageEvent('message', { data, origin }));

  /** Lets the async message handler run. */
  const settle = () => new Promise(resolve => setTimeout(resolve));

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    lang = TestBed.inject(MnLanguageService);
    config = TestBed.inject(MnConfigService);
    posted = [];
    // Karma runs the specs in a frame, so the listener talks to window.parent.
    spyOn(window.parent, 'postMessage').and.callFake(((message: MnPreviewEvent) => {
      posted.push(message);
    }) as typeof window.postMessage);
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(async () => {
    send({ type: 'mn-preview-edit-mode', enabled: false });
    await settle();
    host.remove();
  });

  it('tells the editor it is ready, so content posted from then on arrives', () => {
    enableMnPreviewMode(config, lang, [EDITOR]);
    expect(posted).toContain(jasmine.objectContaining({ type: 'mn-preview-ready', path: location.pathname }));
    expect((window.parent.postMessage as jasmine.Spy).calls.mostRecent().args[1]).toBe(EDITOR);
  });

  it('ignores messages from origins it was not given', async () => {
    enableMnPreviewMode(config, lang, [EDITOR]);
    send({ type: 'mn-translations-update', translations: { en: { hello: 'Hi' } } }, 'https://evil.example');
    await settle();
    expect(lang.translate('hello')).toBe('hello');
  });

  it('re-renders texts registered for the locale already active', async () => {
    enableMnPreviewMode(config, lang, [EDITOR]);
    const greeting = computed(() => lang.translate('hello'));
    expect(greeting()).toBe('hello');
    send({ type: 'mn-translations-update', translations: { en: { hello: 'Hi' } } });
    await settle();
    expect(greeting()).toBe('Hi');
  });

  it('reports a clicked text instead of following its link while edit mode is on', async () => {
    enableMnPreviewMode(config, lang, [EDITOR]);
    host.innerHTML = '<a href="#elsewhere"><span>  Vraag   een offerte aan </span></a>';
    const span = host.querySelector('span')!;
    send({ type: 'mn-preview-edit-mode', enabled: true });
    await settle();

    span.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(span.hasAttribute('data-mn-preview-hover')).toBeTrue();

    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    span.dispatchEvent(click);
    expect(click.defaultPrevented).toBeTrue();
    expect(posted).toContain(jasmine.objectContaining({
      type: 'mn-preview-select', kind: 'text', text: 'Vraag een offerte aan',
    }));
  });

  it('reports a clicked image by its source', async () => {
    enableMnPreviewMode(config, lang, [EDITOR]);
    host.innerHTML = '<img src="/logo.webp" alt="Logo">';
    send({ type: 'mn-preview-edit-mode', enabled: true });
    await settle();
    host.querySelector('img')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(posted).toContain(jasmine.objectContaining({
      type: 'mn-preview-select', kind: 'image', src: '/logo.webp', alt: 'Logo',
    }));
  });

  it('keeps the page where it was when the site redraws after an update', async () => {
    enableMnPreviewMode(config, lang, [EDITOR]);
    host.style.height = '5000px';
    window.scrollTo(0, 1200);
    const at = window.scrollY;
    expect(at).toBeGreaterThan(0);
    // A site that rebuilds its page a moment after new content arrives, as PBB does.
    const redraw = (e: MessageEvent) => {
      if ((e.data as { type?: string })?.type === 'mn-config-update') setTimeout(() => window.scrollTo(0, 0), 50);
    };
    window.addEventListener('message', redraw);
    send({ type: 'mn-config-update', config: { defaults: {} } });
    await new Promise(resolve => setTimeout(resolve, 300));
    window.removeEventListener('message', redraw);
    expect(window.scrollY).toBe(at);
    window.scrollTo(0, 0);
  });

  it('leaves clicks alone once edit mode is off', async () => {
    enableMnPreviewMode(config, lang, [EDITOR]);
    host.innerHTML = '<span>Text</span>';
    send({ type: 'mn-preview-edit-mode', enabled: true });
    send({ type: 'mn-preview-edit-mode', enabled: false });
    await settle();
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    host.querySelector('span')!.dispatchEvent(click);
    expect(click.defaultPrevented).toBeFalse();
    expect(document.getElementById('mn-preview-edit-style')).toBeNull();
  });
});
