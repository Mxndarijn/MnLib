import { MnInformationCardVariants } from './mn-information-cardVariants';

// TODO make global image type
interface imageType {
  id: number;
  url: string;
  alt?: string;
}

export interface MnInformationCardData {
  bottomBorder?: MnInformationCardVariants['bottomBorder'];
  shadow?: MnInformationCardVariants['shadow'];
  textPosition?: MnInformationCardVariants['textPosition'];

  title: string;
  description: string;
}

export interface MnDefaultInformationCardData extends MnInformationCardData {
  image: imageType;
}



