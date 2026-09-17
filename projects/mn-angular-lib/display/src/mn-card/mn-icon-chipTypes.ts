import { MnIconChipVariants } from './mn-icon-chipVariants';

/** Configuration of one {@link MnIconChip}. Both fields are optional. */
export type MnIconChipTypes = {
  /** Box size. Defaults to `md`. */
  size: MnIconChipVariants['size'];
  /** Colour of the wash and the icon. Defaults to `primary`. */
  color: MnIconChipVariants['color'];
};
