import {ApplicationRef, ComponentRef, createComponent, EnvironmentInjector, inject, Injectable,} from '@angular/core';
import {MnModalRef} from './mn-modal-ref';
import {ModalConfig} from './mn-modal.types';
import {MnModalShellComponent} from './components/mn-modal-shell/mn-modal-shell.component';

@Injectable({
  providedIn: 'root',
})
export class MnModalService {
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);
  private readonly modalStack: MnModalRef<unknown>[] = [];

  open<TResult = unknown, TModel = unknown>(config: ModalConfig<TResult, TModel>): MnModalRef<TResult> {
    // Create the modal shell component
    const componentRef = createComponent(MnModalShellComponent, {
      environmentInjector: this.injector,
    }) as unknown as ComponentRef<MnModalShellComponent<TResult>>;

    // Work off a mutable shallow copy of the (frozen) builder config, shared by
    // both the shell and the ref. `ModalBuilder.build()` returns a frozen object;
    // `MnModalRef.update()` mutates the config in place (so the shell, which holds
    // the same reference, sees the change), which would throw on a frozen object.
    // Cloning here keeps the caller's built config immutable while giving the
    // runtime an extensible object to update (e.g. footer actions set at runtime).
    const workingConfig = {...(config as ModalConfig<TResult>)};

    // TModel is erased at the shell boundary — the shell only needs TResult
    componentRef.instance.config = workingConfig;

    // Create modal ref
    const modalRef = new MnModalRef<TResult>(componentRef, workingConfig);
    componentRef.instance.modalRef = modalRef;

    // Update stack and dim previous modal
    if (this.modalStack.length > 0) {
      const prevModal = this.modalStack[this.modalStack.length - 1];
      (prevModal.component as MnModalShellComponent<unknown>).isStacked.set(true);
    }
    this.modalStack.push(modalRef as unknown as MnModalRef<unknown>);

    // Attach to application
    this.appRef.attachView(componentRef.hostView);
    const domElem = componentRef.location.nativeElement;
    document.body.appendChild(domElem);

    // Clean up on close
    modalRef.afterClosed$.subscribe(() => {
      this.appRef.detachView(componentRef.hostView);
      domElem.remove();

      // Update stack
      const index = this.modalStack.indexOf(modalRef as unknown as MnModalRef<unknown>);
      if (index > -1) {
        this.modalStack.splice(index, 1);
        if (this.modalStack.length > 0) {
          const topModal = this.modalStack[this.modalStack.length - 1];
          (topModal.component as MnModalShellComponent<unknown>).isStacked.set(false);
        }
      }
    });

    return modalRef;
  }
}
