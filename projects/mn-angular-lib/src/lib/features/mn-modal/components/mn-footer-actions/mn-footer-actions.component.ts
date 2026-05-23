import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MnButton } from '../../../mn-button/mn-button';
import { ModalFooterAction, ActionStyle } from '../../mn-modal.types';

@Component({
  selector: 'mn-footer-actions',
  standalone: true,
  imports: [CommonModule, MnButton],
  host: { class: 'contents' },
  template: `
    @for (action of leftActions; track action.label) {
      <button
        mnButton
        [data]="getButtonData(action)"
        [disabled]="action.disabled || false"
        (click)="actionClick.emit(action)"
      >
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
        {{ action.label }}
      </button>
    }
  `,
})
export class MnFooterActionsComponent<TResult = any> {
  @Input() actions: ModalFooterAction<TResult>[] = [];
  @Output() actionClick = new EventEmitter<ModalFooterAction<TResult>>();

  get leftActions(): ModalFooterAction<TResult>[] {
    return this.actions.filter(a => a.position === 'left');
  }

  get rightActions(): ModalFooterAction<TResult>[] {
    return this.actions.filter(a => a.position !== 'left');
  }

  getButtonData(action: ModalFooterAction<TResult>): any {
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
