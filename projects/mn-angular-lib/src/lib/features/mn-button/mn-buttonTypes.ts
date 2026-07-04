import {MnButtonVariants} from './mn-buttonVariants';

export type MnButtonTypes = {
  size: MnButtonVariants['size'];
  variant: MnButtonVariants['variant'];
  borderRadius: MnButtonVariants['borderRadius'];
  color: MnButtonVariants['color'];
  disabled?: MnButtonVariants['disabled'];
  loading?: MnButtonVariants['loading'];
  wrap?: MnButtonVariants['wrap'];
  hover?: MnButtonVariants['hover'];
}
