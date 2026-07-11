import {Component, EventEmitter, Input, Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {LucideDynamicIcon, LucideIconData} from '@lucide/angular';
import {
  ActionStyle,
  defaultIconForStyle,
  MnButton,
  MnButtonTypes,
  MODAL_ACTION_ICON_SIZE,
  ModalFooterAction
} from 'mn-angular-lib';

@Component({
  selector: 'mn-footer-actions',
  standalone: true,
  imports: [CommonModule, MnButton, LucideDynamicIcon],
  host: { class: 'contents' },
  template: `
    @for (action of leftActions; track action.label) {
      <button
        mnButton
        [data]="getButtonData(action)"
        [disabled]="action.disabled || false"
        (click)="actionClick.emit(action)"
      >
        @if (iconFor(action); as icon) {
          <svg [lucideIcon]="icon" [size]="actionIconSize" class="mr-2"></svg>
        }
        {{ action.label }}
      </button>
    }

    <div class="flex-1"></div>

    @for (action of rightActions; track action.label) {
      <button
        mnButton
        [data]="getButtonData(action)"
        [disabled]="action.disabled || false"
        (click)="actionClick.emit(action)"
      >
        @if (iconFor(action); as icon) {
          <svg [lucideIcon]="icon" [size]="actionIconSize" class="mr-2"></svg>
        }
        {{ action.label }}
      </button>
    }
  `,
})
export class MnFooterActionsComponent<TResult = unknown> {
  @Input() actions: ModalFooterAction<TResult>[] = [];
  /** Whether to render leading icons on the action buttons (defaults to true). */
  @Input() showIcons = true;
  @Output() actionClick = new EventEmitter<ModalFooterAction<TResult>>();

  /** Icon size (px) for the footer action buttons. */
  readonly actionIconSize = MODAL_ACTION_ICON_SIZE;

  /**
   * Resolves the leading icon for a footer action, or null when icons are disabled.
   * Uses the per-action override, else the default derived from its style.
   * @param action The footer action to resolve an icon for.
   */
  iconFor(action: ModalFooterAction<TResult>): LucideIconData | null {
    if (!this.showIcons) return null;
    return action.icon ?? defaultIconForStyle(action.style);
  }

  get leftActions(): ModalFooterAction<TResult>[] {
    return this.actions.filter(a => a.position === 'left');
  }

  get rightActions(): ModalFooterAction<TResult>[] {
    return this.actions.filter(a => a.position !== 'left');
  }

  getButtonData(action: ModalFooterAction<TResult>): Partial<MnButtonTypes> {
    switch (action.style) {
      case ActionStyle.PRIMARY:
        return { variant: 'fill', color: 'primary', disabled: action.disabled };
      case ActionStyle.DANGER:
        return { variant: 'fill', color: 'danger', disabled: action.disabled };
      case ActionStyle.GHOST:
        return { variant: 'text', color: 'secondary', disabled: action.disabled };
      case ActionStyle.SECONDARY:
      default:
        return { variant: 'outline', color: 'secondary', disabled: action.disabled };
    }
  }
}
