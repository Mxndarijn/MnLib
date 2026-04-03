import {
  Injectable,
  ApplicationRef,
  ComponentRef,
  createComponent,
  EnvironmentInjector,
  inject,
} from '@angular/core';
import { MnModalRef } from './mn-modal-ref';
import { ModalConfig } from './mn-modal.types';
import { MnModalShellComponent } from './components/mn-modal-shell/mn-modal-shell.component';

@Injectable({
  providedIn: 'root',
})
export class MnModalService {
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);

  open<TResult = any>(config: ModalConfig<TResult>): MnModalRef<TResult> {
    // Create the modal shell component
    const componentRef: ComponentRef<MnModalShellComponent<TResult>> = createComponent(MnModalShellComponent as any, {
      environmentInjector: this.injector,
    });

    // Set the config on the component
    componentRef.instance.config = config;

    // Create modal ref
    const modalRef = new MnModalRef<TResult>(componentRef, config);
    componentRef.instance.modalRef = modalRef;

    // Attach to application
    this.appRef.attachView(componentRef.hostView);
    const domElem = componentRef.location.nativeElement;
    document.body.appendChild(domElem);

    // Clean up on close
    modalRef.afterClosed$.subscribe(() => {
      this.appRef.detachView(componentRef.hostView);
      domElem.remove();
    });

    return modalRef;
  }
}
