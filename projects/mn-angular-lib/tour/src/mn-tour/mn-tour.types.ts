/**
 * One stop of a tour.
 *
 * The library knows nothing about routing, modules or storage: the caller passes texts that are
 * already translated, and uses {@link before} to get the page into the state the step needs
 * (navigate, switch a tab, open a drawer).
 */
export type MnTourStep = {
  /**
   * Value of the `data-tour` attribute on the element to highlight (`'nav-book'` highlights
   * `[data-tour="nav-book"]`). Omit it for a centred card with the page dimmed, such as a
   * welcome or final card.
   */
  target?: string;
  /** Small line above the title (e.g. the tour name). */
  kicker?: string;
  /** The step's title. Also the card's accessible name. */
  title: string;
  /** Short explanation. Also the card's accessible description. */
  body: string;
  /**
   * Runs before the step is shown, after the previous step's {@link after}. Awaited, so it can
   * navigate and return once the router has settled; the tour then still waits for the target
   * to appear. A step with `before` is treated as a page change: the highlight fades out, jumps
   * and fades back in instead of gliding. A `before` that throws skips the step.
   */
  before?: () => void | Promise<void>;
  /**
   * Runs when the tour leaves this step, in either direction or because the tour ended (e.g. to
   * close a drawer that {@link before} opened). Awaited; a throw is ignored.
   */
  after?: () => void | Promise<void>;
};

/** The "next tour" block on a tour's final card. */
export type MnTourNextTour = {
  /** Heading of the block (e.g. "Volgende rondleiding"). */
  kicker?: string;
  /** Name of the next tour. */
  title: string;
  /** Secondary line, e.g. its length ("7 stappen"). */
  meta?: string;
};

/**
 * Every label the tour card renders. The library ships no strings of its own, so all of them
 * come from the caller, already translated.
 */
export type MnTourLabels = {
  /** The small text link at the top right that ends the tour (e.g. "Overslaan"). */
  skip: string;
  /** Back one step (e.g. "Vorige"). */
  previous: string;
  /** Forward one step (e.g. "Volgende"). */
  next: string;
  /** Primary button on the last step when there is no next tour (e.g. "Klaar"). */
  done: string;
  /** Secondary button on the last step when a next tour is offered (e.g. "Sluiten"). */
  close: string;
  /** Primary button on the last step when a next tour is offered (e.g. "Start volgende"). */
  startNext: string;
  /**
   * Screen-reader text for the progress dots, given the 1-based position and the number of
   * steps (e.g. `(n, total) => \`Stap ${n} van ${total}\``).
   */
  stepLabel: (step: number, total: number) => string;
};

/** What a tour is started with. */
export type MnTourOptions = {
  /** The stops, in order. */
  steps: readonly MnTourStep[];
  /** Every label the card renders. */
  labels: MnTourLabels;
  /** Optional block on the final card that offers the next tour. */
  nextTour?: MnTourNextTour;
  /** Index of the first step to show (default 0), e.g. to resume a tour. */
  startAt?: number;
  /** How long a step waits for its target to appear before it is skipped (default 4000 ms). */
  targetTimeoutMs?: number;
  /**
   * Called when a step is skipped because its target never appeared or its `before` threw, so
   * the app can log a stale marker.
   */
  onStepMissing?: (index: number, step: MnTourStep, reason: 'target-not-found' | 'before-failed') => void;
};

/**
 * How a tour ended. `step` is the 0-based index (into `steps`) of the step that was on screen.
 *
 * - `completed`: the last step's primary or secondary button, or Volgende when every later step
 *   turned out missing (then `step` is the last step that was shown). `startNext` is true when
 *   the user chose the next tour from the final card.
 * - `skipped`: the skip link, or Escape.
 * - `closed`: ended from outside through `MnTourRef.close()` (e.g. the user navigated away), or
 *   by starting another tour or offer. `step` is -1 when no step had been shown yet, which also
 *   happens when every step of the tour was missing: the user saw nothing, so there is nothing
 *   to resume.
 */
export type MnTourOutcome =
  | { status: 'completed'; step: number; startNext: boolean }
  | { status: 'skipped'; step: number }
  | { status: 'closed'; step: number };

/**
 * Where an offer card appears: `centred` with the page dimmed (the general tour's welcome
 * offer), or `corner`, bottom-right with the page left undimmed and usable (a module tour).
 */
export type MnTourOfferPlacement = 'centred' | 'corner';

/** What an offer card is opened with. */
export type MnTourOfferOptions = {
  /** Where the card appears. */
  placement: MnTourOfferPlacement;
  /** Small line above the title. */
  kicker?: string;
  /** The offer's title (e.g. "Rondleiding: wedstrijden organiseren"). */
  title: string;
  /** Short explanation, e.g. the tour's length. */
  body: string;
  /** Button labels. */
  labels: {
    /** Declines the offer (e.g. "Niet nu"). */
    dismiss: string;
    /** Accepts it (e.g. "Rondleiding starten" / "Start"). */
    accept: string;
  };
};

/**
 * How an offer ended: `accepted` / `dismissed` by its buttons (Escape dismisses), or `closed`
 * from outside through `MnTourOfferRef.close()` without an answer.
 */
export type MnTourOfferOutcome = { status: 'accepted' } | { status: 'dismissed' } | { status: 'closed' };

/**
 * The library's motion timings (ms). Exported so an app's own motion and tests can line up
 * with them. Under `prefers-reduced-motion` every one of them is skipped.
 */
export const MN_TOUR_MOTION = {
  /** The highlight and the card glide between two stops on the same page. */
  glideMs: 450,
  /** The highlight and the dim fade in after a page, tab or drawer change (ease-out). */
  fadeInMs: 450,
  /** The highlight and the dim fade out before a page change, and at the end. */
  fadeOutMs: 200,
  /** The card's content fades out, and the new content in, over this each. */
  contentFadeMs: 120,
} as const;
