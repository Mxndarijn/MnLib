// projects/mn-angular-lib/src/lib/mn-mn-alert/mn-mn-alert.service.ts
import { Injectable, Inject, Optional } from '@angular/core';
import { MnAlertStore } from './mn-alert.store';
import { MnAlert, MnAlertId } from './mn-alert.types';
import { MN_ALERT_CONFIG, DEFAULT_MN_ALERT_CONFIG, MnAlertConfig, MnAlertKind } from './mn-alert.tokens';

export interface MnShowInput {
  title: string;
  subTitle?: string;
  duration?: number;
  icon?: unknown;
  cssClass?: string;
  meta?: Record<string, unknown>;
  kind: MnAlertKind;
}

@Injectable({ providedIn: 'root' })
export class MnAlertService {
  private readonly cfg: Required<MnAlertConfig>;
  private readonly userDurations?: Partial<Record<MnAlertKind, number | null>>;
  private readonly hasUserDurations: boolean;

  constructor(
    private readonly store: MnAlertStore,
    @Optional() @Inject(MN_ALERT_CONFIG) cfg: MnAlertConfig | null
  ) {
    this.userDurations = cfg?.durations;
    this.hasUserDurations = !!cfg?.durations;
    this.cfg = {
      ...DEFAULT_MN_ALERT_CONFIG,
      ...(cfg ?? {}),
      // Do not pre-merge durations; keep defaults separate and use logic in kind()
      durations: DEFAULT_MN_ALERT_CONFIG.durations,
      cssClasses: { ...DEFAULT_MN_ALERT_CONFIG.cssClasses, ...(cfg?.cssClasses ?? {}) },
      icons: { ...DEFAULT_MN_ALERT_CONFIG.icons, ...(cfg?.icons ?? {}) }
    };
  }

  show(input: MnShowInput): MnAlertId {
    // Always ensure a numeric duration is set
    let duration = input.duration;
    if (duration == null) {
      // Prefer user defaultDuration if provided and not null, otherwise use library per-kind default
      const userDefault = this.cfg.defaultDuration;
      if (typeof userDefault === 'number') {
        duration = userDefault;
      } else {
        duration = DEFAULT_MN_ALERT_CONFIG.durations[input.kind as keyof typeof DEFAULT_MN_ALERT_CONFIG.durations] as number;
      }
    }

    const a: Omit<MnAlert, 'id'> = {
      title: input.title,
      subTitle: input.subTitle,
      duration,
      icon: input.icon,
      cssClass: input.cssClass,
      meta: input.meta,
      kind: input.kind
    };
    return this.store.show(this.cfg.finalize(a as MnAlert));
  }

  success(title: string, subTitle?: string, extra?: Partial<MnShowInput>) {
    return this.kind('success', title, subTitle, extra);
  }
  info(title: string, subTitle?: string, extra?: Partial<MnShowInput>) {
    return this.kind('info', title, subTitle, extra);
  }
  warning(title: string, subTitle?: string, extra?: Partial<MnShowInput>) {
    return this.kind('warning', title, subTitle, extra);
  }
  error(title: string, subTitle?: string, extra?: Partial<MnShowInput>) {
    return this.kind('error', title, subTitle, extra);
  }

  dismiss(id: MnAlertId) { this.store.dismiss(id); }
  clear() { this.store.clear(); }

  private kind(kind: MnAlertKind, title: string, subTitle?: string, extra?: Partial<MnShowInput>) {
    let duration: number | null | undefined = extra?.duration;

    if (duration == null) {
      if (this.hasUserDurations) {
        const userDur = this.userDurations?.[kind];
        if (typeof userDur === 'number') {
          duration = userDur;
        } else {
          // userDur is undefined or null -> fallback to user defaultDuration if numeric
          if (typeof this.cfg.defaultDuration === 'number') {
            duration = this.cfg.defaultDuration;
          } else {
            duration = this.cfg.durations[kind as keyof typeof this.cfg.durations];
          }
        }
      } else {
        // No user durations provided at all; use library defaults per kind
        duration = this.cfg.durations[kind as keyof typeof this.cfg.durations];
      }
    }

    const cssClass = extra?.cssClass ?? this.cfg.cssClasses[kind];
    const icon = (extra?.icon ?? this.cfg.icons[kind]) as unknown;

    return this.show({ title, subTitle, duration: duration as number, cssClass, icon, meta: extra?.meta , kind: kind});
  }
}
