import { MnInformationCardVariants } from './mn-information-cardVariants';

export type { MnImageType } from '../../shared/types';

export type MnInformationCardBaseData = {
  id: number;
  bottomBorder?: MnInformationCardVariants['bottomBorder'];
  shadow?: MnInformationCardVariants['shadow'];
  textPosition?: MnInformationCardVariants['textPosition'];
  borderRadius: MnInformationCardVariants['borderRadius'];
  title: string;
  description: string;
}

export type MnInformationCardData<TExtra = unknown> =
  MnInformationCardBaseData & TExtra;
