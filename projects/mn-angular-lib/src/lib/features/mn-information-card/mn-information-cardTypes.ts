import { MnInformationCardVariants } from './mn-information-cardVariants';

// TODO make global image type
interface imageType {
  id: number;
  url: string;
  alt?: string;
}

export interface MnInformationCardTypes {
  bottomBorder?: MnInformationCardVariants['bottomBorder'];
  shadow?: MnInformationCardVariants['shadow'];
  textPosition?: MnInformationCardVariants['textPosition'];
  title: string;
  description: string;
  image?: imageType;
}
