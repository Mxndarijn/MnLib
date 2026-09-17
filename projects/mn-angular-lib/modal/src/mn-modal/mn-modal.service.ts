import {ApplicationRef, ComponentRef, createComponent, EnvironmentInjector, inject, Injectable, Type,} from '@angular/core';
import {MnModalRef, ModalCloseReason, ModalConfig} from 'mn-angular-lib/modal-core';
import type {MnModalShellComponent} from 'mn-angular-lib/modal-ui';

/** The modal components entry point, once loaded. */
type ModalUi = { MnModalShellComponent: Type<MnModalShellComponent<unknown>> };

/** The loaded modal components, shared by every service instance. */
let modalUi: ModalUi | null = null;

/** The in-flight or settled load of the modal components. */
let modalUiLoad: Promise<ModalUi> | null = null;

/**
 * Loads `mn-angular-lib/modal-ui` once. The shell and its bodies render every form field and
 * the table, so importing them statically put most of the library into each consumer's
 * startup bundle just because a service injects `MnModalService`.
 * @returns The loaded entry point.
 */
function loadModalUi(): Promise<ModalUi> {
  modalUiLoad ??= import('mn-angular-lib/modal-ui').then((ui) => (modalUi = ui));
  return modalUiLoad;
}

@Injectable({
  providedIn: 'root',
})
export class MnModalService {
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);
  private readonly modalStack: MnModalRef<unknown>[] = [];

  constructor() {
    // Fetch the modal components once the app is idle, so the first modal opens without a
    // network round trip while startup never waits for them.
    if (typeof window !== 'undefined') {
      const whenIdle = window.requestIdleCallback ?? ((callback: () => void) => setTimeout(callback, 2000));
      whenIdle(() => void this.preload().catch(() => undefined));
    }
  }

  /**
   * Loads the modal components ahead of the first `open()`. After it resolves, `open()` renders
   * synchronously; tests await it before asserting on the DOM.
   * @returns Resolves once the components are loaded.
   */
  preload(): Promise<void> {
    return loadModalUi().then(() => undefined);
  }

  open<TResult = unknown, TModel = unknown>(config: ModalConfig<TResult, TModel>): MnModalRef<TResult> {
    // Work off a mutable shallow copy of the (frozen) builder config, shared by
    // both the shell and the ref. `ModalBuilder.build()` returns a frozen object;
    // `MnModalRef.update()` mutates the config in place (so the shell, which holds
    // the same reference, sees the change), which would throw on a frozen object.
    // Cloning here keeps the caller's built config immutable while giving the
    // runtime an extensible object to update (e.g. footer actions set at runtime).
    const workingConfig = {...(config as ModalConfig<TResult>)};

    // The ref exists straight away so callers can subscribe and close as before; the shell
    // attaches to it as soon as the modal components are available (immediately once loaded).
    const modalRef = new MnModalRef<TResult>(null, workingConfig);

    if (modalUi) {
      this.render(modalUi, modalRef, workingConfig);
    } else {
      loadModalUi().then(
        (ui) => {
          if (!modalRef.isCloseRequested) this.render(ui, modalRef, workingConfig);
        },
        (error: unknown) => {
          console.error('[MnModal] Failed to load the modal components', error);
          modalRef.dismiss(ModalCloseReason.PROGRAMMATIC);
        },
      );
    }

    return modalRef;
  }

  /**
   * Creates the shell for a modal, stacks it on top of any open modal and attaches it to the app.
   * @param ui The loaded modal components.
   * @param modalRef The ref returned from `open()`.
   * @param workingConfig The mutable config shared by the ref and the shell.
   */
  private render<TResult>(ui: ModalUi, modalRef: MnModalRef<TResult>, workingConfig: ModalConfig<TResult>): void {
    const componentRef = createComponent(ui.MnModalShellComponent, {
      environmentInjector: this.injector,
    }) as unknown as ComponentRef<MnModalShellComponent<TResult>>;

    // TModel is erased at the shell boundary — the shell only needs TResult
    componentRef.instance.config = workingConfig;
    componentRef.instance.modalRef = modalRef;
    modalRef.attach(componentRef);

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
  }
}
