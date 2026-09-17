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

  /** Whether close() or dismiss() has run, so a shell that finishes loading afterwards is never shown. */
  private closeRequested = false;

  /**
   * @param componentRef The rendered modal shell, or null while `MnModalService` is still
   * loading the modal components (`mn-angular-lib/modal-ui`); it is attached with {@link attach}.
   * @param config The modal's mutable working config, shared with the shell.
   */
  constructor(
    private componentRef: ComponentRef<unknown> | null,
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
    this.closeRequested = true;
    const shell = this.componentRef?.instance as { startClosing?: () => Promise<void> } | undefined;
    if (shell && typeof shell.startClosing === 'function') {
      await shell.startClosing();
    }
    this.closeSubject.next(event);
    this.closeSubject.complete();
    this.destroy();
  }

  update(config: Partial<BaseModalConfig<TResult>>): void {
    Object.assign(this.config, config);
    // Trigger change detection on the shell component, once it is rendered
    this.componentRef?.changeDetectorRef.detectChanges();
  }

  /** The rendered shell component, or undefined while the modal components are still loading. */
  get component(): unknown {
    return this.componentRef?.instance;
  }

  /** Whether close() or dismiss() has been called. */
  get isCloseRequested(): boolean {
    return this.closeRequested;
  }

  /**
   * Attaches the rendered shell once `MnModalService` has loaded the modal components.
   * @param componentRef The created shell.
   */
  attach(componentRef: ComponentRef<unknown>): void {
    this.componentRef = componentRef;
  }

  private destroy(): void {
    this.componentRef?.destroy();
  }
}
