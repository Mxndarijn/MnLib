import { MnInformationCardVariants } from './mn-information-cardVariants';

// TODO make global image type
export interface MnImageType {
  id: number;
  url: string;
  alt?: string;
}

export interface MnInformationCardBaseData  {
  id: number;
  bottomBorder?: MnInformationCardVariants['bottomBorder'];
  shadow?: MnInformationCardVariants['shadow'];
  textPosition?: MnInformationCardVariants['textPosition'];
  title: string;
  description: string;
}

export type MnInformationCardData<TExtra = unknown> =
  MnInformationCardBaseData  & TExtra;
