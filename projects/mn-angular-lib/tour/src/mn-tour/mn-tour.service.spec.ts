import { TestBed } from '@angular/core/testing';
import { MnTourService } from './mn-tour.service';
import { MnTourLabels, MnTourOptions, MnTourStep } from './mn-tour.types';

/** Labels as an app would pass them (the library has none of its own). */
const LABELS: MnTourLabels = {
  skip: 'Overslaan',
  previous: 'Vorige',
  next: 'Volgende',
  done: 'Klaar',
  close: 'Sluiten',
  startNext: 'Start volgende',
  stepLabel: (n, total) => `Stap ${n} van ${total}`,
};

/** Polls until `cond` holds, failing after `timeoutMs`. Real time: the tour waits on real timers. */
async function until(cond: () => boolean, timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error('condition not met in time');
    await new Promise((r) => setTimeout(r, 10));
  }
}

/** Lets pending timers and microtasks run. */
function flush(ms = 20): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

describe('MnTourService', () => {
  let service: MnTourService;
  let compact: boolean;
  let reduced: boolean;
  const added: HTMLElement[] = [];

  /** Adds a visible target `[data-tour=name]` at a fixed place on the page. */
  function addTarget(name: string, top = 100, left = 100, width = 120, height = 40): HTMLElement {
    const el = document.createElement('div');
    el.setAttribute('data-tour', name);
    el.textContent = name;
    Object.assign(el.style, {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${width}px`,
      height: `${height}px`,
    });
    document.body.appendChild(el);
    added.push(el);
    return el;
  }

  /** The overlay host, or null once removed. */
  const overlay = (): HTMLElement | null => document.body.querySelector(':scope > mn-tour-overlay');
  /** The card, or null. */
  const card = (): HTMLElement | null => document.body.querySelector('.mn-tour-card');
  /** The highlight. */
  const hole = (): HTMLElement | null => document.body.querySelector('.mn-tour-hole');
  /** The title text on the card. */
  const title = (): string => card()?.querySelector('h2')?.textContent?.trim() ?? '';
  /** The button with this exact label. */
  const button = (label: string): HTMLButtonElement | null =>
    Array.from(card()?.querySelectorAll<HTMLButtonElement>('button') ?? []).find(
      (b) => b.textContent?.trim() === label,
    ) ?? null;
  /** Sends a key to the document, as a user pressing it with focus on `on` would. */
  const press = (key: string, on: EventTarget = document.body): void => {
    on.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  };

  const steps = (): MnTourStep[] => [
    { target: 'a', kicker: 'Rondleiding', title: 'Stap A', body: 'Uitleg A' },
    { target: 'b', title: 'Stap B', body: 'Uitleg B' },
    { target: 'c', title: 'Stap C', body: 'Uitleg C' },
  ];

  const opts = (extra: Partial<MnTourOptions> = {}): MnTourOptions => ({
    steps: steps(),
    labels: LABELS,
    targetTimeoutMs: 150,
    ...extra,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MnTourService);
    compact = false;
    reduced = true;
    spyOn(service, 'isCompactViewport').and.callFake(() => compact);
    spyOn(service, 'prefersReducedMotion').and.callFake(() => reduced);
    addTarget('a', 100, 100);
    addTarget('b', 300, 100);
    addTarget('c', 500, 100);
  });

  afterEach(async () => {
    service.ngOnDestroy();
    added.splice(0).forEach((el) => el.remove());
    await flush();
  });

  describe('a tour', () => {
    it('shows the first step beside its target, labelled for screen readers, with focus inside', async () => {
      service.start(opts());
      await until(() => title() === 'Stap A');

      const c = card()!;
      expect(c.classList).toContain('mn-tour-card--beside');
      expect(c.getAttribute('role')).toBe('dialog');
      expect(document.getElementById(c.getAttribute('aria-labelledby')!)?.textContent).toContain('Stap A');
      expect(document.getElementById(c.getAttribute('aria-describedby')!)?.textContent).toContain('Uitleg A');
      expect(c.textContent).toContain('Rondleiding');
      expect(c.contains(document.activeElement)).toBeTrue();

      // The ring is the target's box plus padding.
      const h = hole()!;
      expect(h.classList).toContain('is-visible');
      expect(parseFloat(h.style.top)).toBe(94);
      expect(parseFloat(h.style.width)).toBe(132);

      // The card sits to the right of the highlight, clear of it.
      const pos = c.getBoundingClientRect();
      expect(pos.left).toBeGreaterThan(100 + 120);
    });

    it('walks forward and back with the buttons, with dots and no Vorige on the first step', async () => {
      const ref = service.start(opts());
      await until(() => title() === 'Stap A');
      expect(button('Vorige')).toBeNull();
      expect(card()!.querySelectorAll('.mn-tour-dot').length).toBe(3);
      expect(card()!.querySelector('.sr-only')?.textContent).toBe('Stap 1 van 3');

      button('Volgende')!.click();
      await until(() => title() === 'Stap B');
      expect(ref.step()).toBe(1);
      expect(card()!.querySelectorAll('.mn-tour-dot')[1].classList).toContain('is-active');

      button('Vorige')!.click();
      await until(() => title() === 'Stap A');
      expect(ref.step()).toBe(0);
    });

    it('keeps one card mounted between steps', async () => {
      service.start(opts());
      await until(() => title() === 'Stap A');
      const first = card();
      button('Volgende')!.click();
      await until(() => title() === 'Stap B');
      expect(card()).toBe(first);
    });

    it('completes on the last step with Klaar and removes the overlay', async () => {
      const ref = service.start(opts({ startAt: 2 }));
      await until(() => title() === 'Stap C');
      expect(card()!.querySelector('.mn-tour-skip')).toBeNull();
      button('Klaar')!.click();
      expect(await ref.result).toEqual({ status: 'completed', step: 2, startNext: false });
      await until(() => overlay() === null);
    });

    it('offers the next tour on the final card', async () => {
      const ref = service.start(
        opts({ startAt: 2, nextTour: { kicker: 'Volgende rondleiding', title: 'Baan reserveren', meta: '4 stappen' } }),
      );
      await until(() => title() === 'Stap C');
      const block = card()!.querySelector('.mn-tour-next')!;
      expect(block.textContent).toContain('Volgende rondleiding');
      expect(block.textContent).toContain('Baan reserveren');
      expect(block.textContent).toContain('4 stappen');
      expect(button('Vorige')).toBeNull();
      expect(button('Sluiten')).not.toBeNull();

      button('Start volgende')!.click();
      expect(await ref.result).toEqual({ status: 'completed', step: 2, startNext: true });
    });

    it('completes without the next tour when Sluiten is pressed', async () => {
      const ref = service.start(opts({ startAt: 2, nextTour: { title: 'Baan reserveren' } }));
      await until(() => title() === 'Stap C');
      button('Sluiten')!.click();
      expect(await ref.result).toEqual({ status: 'completed', step: 2, startNext: false });
    });

    describe('final link', () => {
      const link = (): HTMLButtonElement | null => card()?.querySelector('.mn-tour-link') ?? null;

      it('is rendered only on the last step', async () => {
        service.start(opts({ finalLink: { label: 'Meer in de help', run: () => undefined } }));
        await until(() => title() === 'Stap A');
        expect(link()).toBeNull();
        button('Volgende')!.click();
        await until(() => title() === 'Stap B');
        expect(link()).toBeNull();
        button('Volgende')!.click();
        await until(() => title() === 'Stap C');
        expect(link()?.textContent).toContain('Meer in de help');
        // The footer keeps its own controls.
        expect(button('Vorige')).not.toBeNull();
        expect(button('Klaar')).not.toBeNull();
      });

      it('is absent when finalLink is omitted', async () => {
        service.start(opts({ startAt: 2 }));
        await until(() => title() === 'Stap C');
        expect(link()).toBeNull();
      });

      it('completes the tour without the next tour, then calls run once', async () => {
        const order: string[] = [];
        const run = jasmine.createSpy('run').and.callFake(() => void order.push('run'));
        const ref = service.start(opts({ startAt: 2, finalLink: { label: 'Help', run } }));
        void ref.result.then(() => order.push('result'));
        await until(() => title() === 'Stap C');
        link()!.click();
        expect(await ref.result).toEqual({ status: 'completed', step: 2, startNext: false });
        await until(() => run.calls.count() === 1);
        await flush(50);
        expect(run).toHaveBeenCalledTimes(1);
        expect(order).toEqual(['result', 'run']);
      });

      it('sits between the body and the next-tour block, which still works', async () => {
        const ref = service.start(
          opts({ startAt: 2, nextTour: { title: 'Baan reserveren' }, finalLink: { label: 'Help', run: () => undefined } }),
        );
        await until(() => title() === 'Stap C');
        const body = document.getElementById(card()!.getAttribute('aria-describedby')!)!;
        const next = card()!.querySelector('.mn-tour-next')!;
        expect(body.compareDocumentPosition(link()!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(link()!.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        button('Start volgende')!.click();
        expect(await ref.result).toEqual({ status: 'completed', step: 2, startNext: true });
      });

      it('is a normal button in the tab order, so Enter on it is its own click', async () => {
        const run = jasmine.createSpy('run');
        const ref = service.start(opts({ startAt: 2, finalLink: { label: 'Help', run } }));
        await until(() => title() === 'Stap C');
        expect(link()!.tagName).toBe('BUTTON');
        expect(link()!.tabIndex).toBe(0);
        // The service must not turn Enter on the link into "Klaar" as well.
        press('Enter', link()!);
        await flush(50);
        expect(ref.step()).toBe(2);
        expect(run).not.toHaveBeenCalled();
      });
    });

    it('reports a skip from the link with the step it happened on', async () => {
      const ref = service.start(opts({ startAt: 1 }));
      await until(() => title() === 'Stap B');
      (card()!.querySelector('.mn-tour-skip') as HTMLButtonElement).click();
      expect(await ref.result).toEqual({ status: 'skipped', step: 1 });
    });

    it('skips on Escape', async () => {
      const ref = service.start(opts());
      await until(() => title() === 'Stap A');
      press('Escape');
      expect(await ref.result).toEqual({ status: 'skipped', step: 0 });
    });

    it('moves with ArrowRight, ArrowLeft and Enter, but lets a focused button handle its own Enter', async () => {
      const ref = service.start(opts());
      await until(() => title() === 'Stap A');
      press('ArrowRight');
      await until(() => title() === 'Stap B');
      press('ArrowLeft');
      await until(() => title() === 'Stap A');
      press('Enter', card()!);
      await until(() => title() === 'Stap B');

      press('Enter', button('Volgende')!);
      await flush(50);
      expect(ref.step()).toBe(1);
    });

    it('ends as closed through the ref, running the open step`s after()', async () => {
      const after = jasmine.createSpy('after');
      const ref = service.start({ ...opts(), steps: [{ target: 'a', title: 'A', body: '', after }, ...steps()] });
      await until(() => title() === 'A');
      ref.close();
      expect(await ref.result).toEqual({ status: 'closed', step: 0 });
      expect(after).toHaveBeenCalledTimes(1);
    });

    it('closes a running tour when another starts', async () => {
      const first = service.start(opts());
      await until(() => title() === 'Stap A');
      service.start(opts({ startAt: 1 }));
      expect(await first.result).toEqual({ status: 'closed', step: 0 });
      await until(() => title() === 'Stap B');
    });

    it('skips a step whose target never appears, and leaves it out of the dots', async () => {
      const missing = jasmine.createSpy('onStepMissing');
      const ref = service.start({
        ...opts(),
        steps: [steps()[0], { target: 'nope', title: 'Weg', body: '' }, steps()[2]],
        onStepMissing: missing,
      });
      await until(() => title() === 'Stap A');
      button('Volgende')!.click();
      await until(() => title() === 'Stap C');
      expect(ref.step()).toBe(2);
      expect(missing).toHaveBeenCalledWith(1, jasmine.objectContaining({ target: 'nope' }), 'target-not-found');
      expect(card()!.querySelectorAll('.mn-tour-dot').length).toBe(2);
      expect(card()!.querySelector('.sr-only')?.textContent).toBe('Stap 2 van 2');

      // Back skips the missing step too.
      button('Vorige')!.click();
      await until(() => title() === 'Stap A');
    });

    it('does not count a marker that is in the DOM but not rendered', async () => {
      const hidden = addTarget('hidden');
      hidden.style.display = 'none';
      const ref = service.start({
        ...opts(),
        steps: [{ target: 'hidden', title: 'Verborgen', body: '' }, steps()[0]],
      });
      await until(() => title() === 'Stap A');
      expect(ref.step()).toBe(1);
    });

    it('ends as completed when every remaining step is missing', async () => {
      const ref = service.start({ ...opts(), steps: [steps()[0], { target: 'nope', title: 'Weg', body: '' }] });
      await until(() => title() === 'Stap A');
      button('Volgende')!.click();
      expect(await ref.result).toEqual({ status: 'completed', step: 0, startNext: false });
    });

    it('awaits before(), then waits for a target that only appears afterwards', async () => {
      const calls: string[] = [];
      const ref = service.start({
        ...opts({ targetTimeoutMs: 1000 }),
        steps: [
          { target: 'a', title: 'A', body: '', after: () => void calls.push('after A') },
          {
            target: 'late',
            title: 'Laat',
            body: '',
            before: async () => {
              calls.push('before late');
              await flush(30);
              // The router "renders" the new page a little later still.
              setTimeout(() => addTarget('late', 200, 600), 60);
            },
          },
        ],
      });
      await until(() => title() === 'A');
      button('Volgende')!.click();
      await until(() => title() === 'Laat');
      expect(calls).toEqual(['after A', 'before late']);
      expect(ref.step()).toBe(1);
    });

    it('skips a step whose before() throws', async () => {
      const missing = jasmine.createSpy('onStepMissing');
      service.start({
        ...opts(),
        steps: [
          {
            target: 'a',
            title: 'Kapot',
            body: '',
            before: () => {
              throw new Error('router said no');
            },
          },
          steps()[1],
        ],
        onStepMissing: missing,
      });
      await until(() => title() === 'Stap B');
      expect(missing).toHaveBeenCalledWith(0, jasmine.any(Object), 'before-failed');
    });

    it('shows a step without a target centred, with the whole page dimmed', async () => {
      service.start({ ...opts(), steps: [{ title: 'Welkom', body: 'Hallo' }, steps()[0]] });
      await until(() => title() === 'Welkom');
      expect(card()!.classList).toContain('mn-tour-card--centred');
      expect(document.body.querySelector('.mn-tour-dim')!.classList).toContain('is-visible');
      expect(hole()!.classList).not.toContain('is-visible');
      expect(card()!.getAttribute('aria-modal')).toBe('true');
    });

    it('is a bottom sheet below lg', async () => {
      compact = true;
      service.start(opts());
      await until(() => title() === 'Stap A');
      expect(card()!.classList).toContain('mn-tour-card--sheet');
      expect(card()!.style.transform).toBe('');
      expect(hole()!.classList).toContain('is-visible');
    });

    it('marks itself reduced-motion when the user asks for it', async () => {
      service.start(opts());
      await until(() => title() === 'Stap A');
      expect(document.body.querySelector('.mn-tour-root')!.classList).toContain('mn-tour-reduced');
    });

    it('gives focus back to where it was when the tour ends', async () => {
      const trigger = document.createElement('button');
      document.body.appendChild(trigger);
      added.push(trigger);
      trigger.focus();
      const ref = service.start(opts());
      await until(() => title() === 'Stap A');
      expect(document.activeElement).not.toBe(trigger);
      ref.close();
      await until(() => overlay() === null);
      expect(document.activeElement).toBe(trigger);
    });

    it('keeps Tab inside the card, so a keyboard user cannot reach the page behind it', async () => {
      const outside = document.createElement('a');
      outside.href = '#elsewhere';
      document.body.appendChild(outside);
      added.push(outside);
      service.start(opts({ startAt: 1 }));
      await until(() => title() === 'Stap B');

      const controls = Array.from(card()!.querySelectorAll<HTMLButtonElement>('button'));
      const first = controls[0];
      const last = controls[controls.length - 1];
      last.focus();
      press('Tab', last);
      expect(document.activeElement).toBe(first);
      first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
      expect(document.activeElement).toBe(last);

      // Focus that escaped (e.g. by a click elsewhere) is pulled back in on the next Tab.
      outside.focus();
      press('Tab', outside);
      expect(card()!.contains(document.activeElement)).toBeTrue();
    });

    it('leaves Tab alone for the corner offer', async () => {
      service.offer({ placement: 'corner', title: 'T', body: 'B', labels: { dismiss: 'Niet nu', accept: 'Start' } });
      const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
      document.body.dispatchEvent(event);
      expect(event.defaultPrevented).toBeFalse();
    });

    it('blocks clicks on the page while it runs', async () => {
      service.start(opts());
      await until(() => title() === 'Stap A');
      expect(document.body.querySelector('.mn-tour-blocker')).not.toBeNull();
    });

    it('resolves at once for a tour without steps', async () => {
      const ref = service.start({ steps: [], labels: LABELS });
      expect(await ref.result).toEqual({ status: 'completed', step: -1, startNext: false });
      expect(overlay()).toBeNull();
    });
  });

  describe('motion', () => {
    beforeEach(() => (reduced = false));

    it('glides between two targets on the same page', async () => {
      service.start(opts());
      await until(() => title() === 'Stap A' && card()!.classList.contains('is-shown'));
      button('Volgende')!.click();
      await until(() => title() === 'Stap B');
      expect(hole()!.classList).toContain('is-gliding');
      expect(card()!.classList).toContain('is-gliding');
      await until(() => !hole()!.classList.contains('is-gliding'), 1500);
    });

    it('fades out and jumps, never glides, when a step changes the page', async () => {
      service.start({
        ...opts(),
        steps: [steps()[0], { ...steps()[1], before: () => undefined }],
      });
      await until(() => title() === 'Stap A' && card()!.classList.contains('is-shown'));
      button('Volgende')!.click();
      await until(() => !hole()!.classList.contains('is-visible'));
      await until(() => title() === 'Stap B');
      expect(hole()!.classList).not.toContain('is-gliding');
      expect(hole()!.classList).toContain('is-visible');
      expect(document.body.querySelector('.mn-tour-root')!.classList).not.toContain('mn-tour-reduced');
    });

    it('crossfades the content: hidden while the step changes, shown after', async () => {
      service.start(opts());
      const content = (): HTMLElement => document.body.querySelector('.mn-tour-content')!;
      await until(() => title() === 'Stap A' && content().classList.contains('is-visible'));
      button('Volgende')!.click();
      await until(() => !content().classList.contains('is-visible'));
      expect(title()).toBe('Stap A');
      await until(() => title() === 'Stap B' && content().classList.contains('is-visible'));
    });
  });

  describe('an offer', () => {
    const offer = { title: 'Rondleiding: wedstrijden', body: '7 stappen', labels: { dismiss: 'Niet nu', accept: 'Start' } };

    it('sits in the corner without dimming or blocking the page, and does not take focus', async () => {
      const outside = document.createElement('button');
      document.body.appendChild(outside);
      added.push(outside);
      outside.focus();
      const ref = service.offer({ ...offer, placement: 'corner' });

      expect(card()!.classList).toContain('mn-tour-card--corner');
      expect(document.body.querySelector('.mn-tour-root')!.classList).toContain('mn-tour-passive');
      expect(document.body.querySelector('.mn-tour-blocker')).toBeNull();
      expect(document.body.querySelector('.mn-tour-dim')!.classList).not.toContain('is-visible');
      expect(card()!.hasAttribute('aria-modal')).toBeFalse();
      expect(document.activeElement).toBe(outside);
      expect(card()!.querySelector('.mn-tour-skip')).toBeNull();
      expect(card()!.querySelector('.mn-tour-dot')).toBeNull();

      // Escape on the page is not the offer's business.
      press('Escape', outside);
      await flush();
      expect(overlay()).not.toBeNull();

      button('Niet nu')!.click();
      expect(await ref.result).toEqual({ status: 'dismissed' });
    });

    it('is centred and dimmed for the welcome offer, with focus inside, and Escape declines', async () => {
      const ref = service.offer({ ...offer, placement: 'centred' });
      expect(card()!.classList).toContain('mn-tour-card--centred');
      expect(document.body.querySelector('.mn-tour-dim')!.classList).toContain('is-visible');
      expect(card()!.contains(document.activeElement)).toBeTrue();
      press('Escape');
      expect(await ref.result).toEqual({ status: 'dismissed' });
    });

    it('reports accepted, and the tour started from it reuses the card on screen', async () => {
      const ref = service.offer({ ...offer, placement: 'centred' });
      const offerCard = card();
      button('Start')!.click();
      expect(await ref.result).toEqual({ status: 'accepted' });
      service.start(opts());
      await until(() => title() === 'Stap A');
      expect(card()).toBe(offerCard);
    });

    it('reports closed when closed from outside', async () => {
      const ref = service.offer({ ...offer, placement: 'corner' });
      ref.close();
      expect(await ref.result).toEqual({ status: 'closed' });
      await until(() => overlay() === null);
    });
  });
});
