import { Observable, Subject } from 'rxjs';
import {ComponentRef} from '@angular/core';
import {
  ModalRef,
  ModalCloseEvent,
  ModalCloseReason,
  BaseModalConfig,
} from './mn-modal.types';

export class MnModalRef<TResult = unknown> implements ModalRef<TResult> {
  private readonly closeSubject = new Subject<ModalCloseEvent<TResult>>();
  public readonly afterClosed$: Observable<ModalCloseEvent<TResult>> = this.closeSubject.asObservable();

  constructor(
    private componentRef: ComponentRef<unknown>,
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
    const shell = this.componentRef.instance as { startClosing?: () => Promise<void> };
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

  get component(): unknown {
    return this.componentRef.instance;
  }

  private destroy(): void {
    this.componentRef.destroy();
  }
}
