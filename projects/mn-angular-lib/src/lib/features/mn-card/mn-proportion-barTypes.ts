import { MnIconChipVariants } from './mn-icon-chipVariants';

/** One coloured run of a {@link MnProportionBar}: how much of the whole it covers, and in which colour. */
export type MnProportionSegment = {
  /** Amount in the same unit as the other segments and the total. */
  value: number;
  /** Colour of this run; `gray` for the part that has no answer yet. */
  color: NonNullable<MnIconChipVariants['color']>;
  /**
   * Draw the run as a pale tint of its colour instead of solid. For a part that is on its way but
   * not there yet, next to a solid run of the same colour: spots asked about but not answered,
   * payments announced but not received.
   */
  soft?: boolean;
};

/** Configuration of one {@link MnProportionBar}. */
export type MnProportionBarTypes = {
  /** Track thickness: `sm` inside dense rows, `md` (default) under a section title. */
  height: 'sm' | 'md';
};
