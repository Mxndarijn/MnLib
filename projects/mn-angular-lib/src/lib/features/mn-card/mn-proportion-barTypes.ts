import { MnIconChipVariants } from './mn-icon-chipVariants';

/** One coloured run of a {@link MnProportionBar}: how much of the whole it covers, and in which colour. */
export type MnProportionSegment = {
  /** Amount in the same unit as the other segments and the total. */
  value: number;
  /** Colour of this run; `gray` for the part that has no answer yet. */
  color: NonNullable<MnIconChipVariants['color']>;
};

/** Configuration of one {@link MnProportionBar}. */
export type MnProportionBarTypes = {
  /** Track thickness: `sm` inside dense rows, `md` (default) under a section title. */
  height: 'sm' | 'md';
};
