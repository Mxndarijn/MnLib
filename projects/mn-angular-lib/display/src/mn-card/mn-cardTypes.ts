import { MnCardVariants } from './mn-cardVariants';

/**
 * Configuration of one {@link MnCard}. Every field is optional; the defaults give the
 * compact stacked tile that does not react to the pointer, which is what most cards are.
 */
export type MnCardTypes = {
  /** Inner padding and child gap. `sm` for tiles, `md` for section cards, `lg` for hero cards. */
  padding: MnCardVariants['padding'];
  /** Stacked children (`column`, the default) or one centred line (`row`). */
  layout: MnCardVariants['layout'];
  /** Hover response: `none` (default), `lift` for a card that is a link or a button, or `shadow`. */
  hover: MnCardVariants['hover'];
  /** Entrance animation: `none` (default) or `rise` (needs the consumer's `--animate-rise`). */
  enter: MnCardVariants['enter'];
  /** Corner rounding. Defaults to `two_xl`. */
  borderRadius: MnCardVariants['borderRadius'];
  /** Colour of the accent bar and the heading's icon chip. Defaults to `primary`. */
  color: MnCardVariants['color'];
  /** Whether to draw the accent bar along the top edge. Defaults to false. */
  accent: boolean;
};
