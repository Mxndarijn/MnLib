import { Observable, Subject } from 'rxjs';
import { ComponentRef, ChangeDetectorRef } from '@angular/core';
import {
  ModalRef,
  ModalCloseEvent,
  ModalCloseReason,
  BaseModalConfig,
} from './mn-modal.types';

// Forward declaration of MnModalShellComponent to avoid circular dependency
// or just use Type<any> for the component ref if we want to be loose
interface ShellComponent<T> {
  config: any;
  modalRef: any;
}

export class MnModalRef<TResult = any> implements ModalRef<TResult> {
  private readonly closeSubject = new Subject<ModalCloseEvent<TResult>>();
  public readonly afterClosed$: Observable<ModalCloseEvent<TResult>> = this.closeSubject.asObservable();

  constructor(
    private componentRef: ComponentRef<any>,
    private config: BaseModalConfig<TResult>
  ) {}

  close(result?: TResult): void {
    const event: ModalCloseEvent<TResult> = {
      reason: ModalCloseReason.COMPLETED,
      result,
    };
    this.animateAndDestroy(event);
  }

  dismiss(reason: ModalCloseReason): void {
    const event: ModalCloseEvent<TResult> = {
      reason,
    };
    this.animateAndDestroy(event);
  }

  private async animateAndDestroy(event: ModalCloseEvent<TResult>): Promise<void> {
    const shell = this.componentRef.instance as any;
    if (shell && typeof shell.startClosing === 'function') {
      await shell.startClosing();
    }
    this.closeSubject.next(event);
    this.closeSubject.complete();
    this.destroy();
  }

  update(config: Partial<BaseModalConfig<TResult>>): void {
    Object.assign(this.config, config);
    // Trigger change detection on the shell component
    this.componentRef.changeDetectorRef.detectChanges();
  }

  get component(): any {
    return this.componentRef.instance;
  }

  private destroy(): void {
    this.componentRef.destroy();
  }
}
