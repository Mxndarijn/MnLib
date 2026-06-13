import {
  Component,
  Input,
  OnInit,
  Type,
  ViewChild,
  ViewContainerRef,
  ComponentRef,
  TemplateRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MnModalRef } from '../../mn-modal-ref';
import { CustomModalConfig } from '../../mn-modal.types';

@Component({
  selector: 'mn-custom-body-host',
  standalone: true,
  imports: [CommonModule],
  template: '<ng-container #container></ng-container>',
})
export class MnCustomBodyHostComponent implements OnInit {
  @Input() config!: CustomModalConfig;
  @Input() modalRef!: MnModalRef<unknown>;

  @ViewChild('container', { read: ViewContainerRef }) container!: ViewContainerRef;

  private componentRef?: ComponentRef<unknown>;

  ngOnInit(): void {
    setTimeout(() => this.loadContent(), 0);
  }

  private loadContent(): void {
    if (!this.container) return;

    this.container.clear();

    if (this.config.component) {
      this.attachComponent(this.config.component);
    } else if (this.config.template) {
      this.attachTemplate(this.config.template);
    }
  }

  attachComponent(component: Type<unknown>): void {
    this.componentRef = this.container.createComponent(component);

    // Pass inputs to the component
    if (this.config.inputs) {
      Object.entries(this.config.inputs).forEach(([key, value]) => {
        (this.componentRef!.instance as Record<string, unknown>)[key] = value;
      });
    }

    // Pass modalRef if the component has a modalRef property
    const instance = this.componentRef.instance as Record<string, unknown>;
    if (instance && 'modalRef' in instance) {
      instance['modalRef'] = this.modalRef;
    }
  }

  attachTemplate(template: TemplateRef<unknown>): void {
    this.container.createEmbeddedView(template, {
      $implicit: this.modalRef,
      modalRef: this.modalRef,
    });
  }
}
