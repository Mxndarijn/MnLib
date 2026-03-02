import {MnAlertKind} from './mn-alert.tokens';
import {MnAlertVariants} from './mn-alertVariants';

export type MnAlertId = string;

export interface MnAlert {
  id: MnAlertId;
  title: string;
  subTitle?: string;
  icon?: unknown;
  cssClass?: string;
  duration?: number;
  meta?: Record<string, unknown>;
  kind: MnAlertKind;
  variant?: MnAlertVariants['variant'];
}
