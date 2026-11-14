import { Component, inject, signal } from '@angular/core';
import { MnButton, MnTourLabels, MnTourOutcome, MnTourService, MnTourStep } from 'mn-angular-lib';
import { DemoPageComponent } from '../shared/demo-page.component';
import { DemoExampleComponent } from '../shared/demo-example.component';

/** The labels an app passes; the library ships none of its own. */
const LABELS: MnTourLabels = {
  skip: 'Overslaan',
  previous: 'Vorige',
  next: 'Volgende',
  done: 'Klaar',
  close: 'Sluiten',
  startNext: 'Start volgende',
  stepLabel: (n, total) => `Stap ${n} van ${total}`,
};

/**
 * Demo of `MnTourService`: a mock page with `data-tour` markers, a tour that glides between
 * them, switches a "tab" in `before()` (a jump with fade), ends on a final card offering the
 * next tour, and both offer cards.
 */
@Component({
  selector: 'app-tour-demo',
  standalone: true,
  imports: [MnButton, DemoPageComponent, DemoExampleComponent],
  templateUrl: './tour-demo.html',
})
export class TourDemo {
  private readonly tours = inject(MnTourService);

  /** Which mock tab is showing. */
  readonly tab = signal<'overview' | 'planning'>('overview');
  /** The last outcome, shown under the buttons. */
  readonly lastOutcome = signal<string>('—');

  /** The demo tour's stops. */
  private readonly steps: MnTourStep[] = [
    { kicker: 'Rondleiding', title: 'Welkom bij LedenCentraal', body: 'In een paar stappen zie je waar alles staat. Je kunt de rondleiding altijd later opnieuw starten.' },
    { target: 'demo-nav', kicker: 'Navigatie', title: 'Het menu', body: 'Hier vind je alle onderdelen van je vereniging.' },
    { target: 'demo-attention', kicker: 'Home', title: 'Vraagt om aandacht', body: 'Wat op jou wacht, zoals openstaande betalingen en verzoeken.' },
    { target: 'demo-soon', kicker: 'Home', title: 'Binnenkort', body: 'Je eerstvolgende wedstrijden, reserveringen en vergaderingen.' },
    {
      target: 'demo-planning',
      kicker: 'Planning',
      title: 'Een ander tabblad',
      body: 'Deze stap wisselt eerst van tabblad: de markering springt en faded in in plaats van te glijden.',
      before: () => {
        this.tab.set('planning');
      },
      after: () => {
        this.tab.set('overview');
      },
    },
    { target: 'demo-account', kicker: 'Account', title: 'Jouw account', body: 'Profiel, voorkeuren en uitloggen.' },
    { kicker: 'Klaar', title: 'Je bent rond', body: 'Dat was de algemene rondleiding.' },
  ];

  /** Starts the demo tour. */
  start(): void {
    const ref = this.tours.start({
      steps: this.steps,
      labels: LABELS,
      nextTour: { kicker: 'Volgende rondleiding', title: 'Een baan reserveren', meta: '4 stappen' },
    });
    void ref.result.then((outcome) => this.lastOutcome.set(this.describe(outcome)));
  }

  /** Shows the bottom-right offer of a module tour. */
  offerCorner(): void {
    const ref = this.tours.offer({
      placement: 'corner',
      kicker: 'Rondleiding',
      title: 'Wedstrijden organiseren',
      body: '7 stappen · ongeveer 2 minuten',
      labels: { dismiss: 'Niet nu', accept: 'Start' },
    });
    void ref.result.then((outcome) => {
      this.lastOutcome.set(`offer: ${outcome.status}`);
      if (outcome.status === 'accepted') this.start();
    });
  }

  /** Shows the centred welcome offer of the general tour. */
  offerCentred(): void {
    const ref = this.tours.offer({
      placement: 'centred',
      kicker: 'Welkom',
      title: 'Zullen we je even rondleiden?',
      body: 'Een korte rondleiding van 7 stappen langs de belangrijkste plekken.',
      labels: { dismiss: 'Niet nu', accept: 'Rondleiding starten' },
    });
    void ref.result.then((outcome) => {
      this.lastOutcome.set(`offer: ${outcome.status}`);
      if (outcome.status === 'accepted') this.start();
    });
  }

  /** A readable line for an outcome. */
  private describe(outcome: MnTourOutcome): string {
    const extra = outcome.status === 'completed' && outcome.startNext ? ' (start next)' : '';
    return `tour: ${outcome.status} at step ${outcome.step}${extra}`;
  }
}
