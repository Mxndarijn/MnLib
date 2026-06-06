import { Component, HostBinding, Input, OnChanges, OnInit, inject, ElementRef } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MnIconTypes } from './mn-iconTypes';
import { mnIconVariants } from './mn-iconVariants';
import { MnIconRegistry } from './mn-icon-registry.service';
import { MN_ICON_MAP } from './mn-icon-map';

@Component({
  selector: 'mn-icon',
  standalone: true,
  templateUrl: './mn-icon.html',
})
export class MnIcon implements OnChanges, OnInit {
  @Input() data: Partial<MnIconTypes> = {};
  @Input() mnIconPistol: any;

  private sanitizer = inject(DomSanitizer);
  private registry = inject(MnIconRegistry);
  private el = inject(ElementRef);

  svgContent: SafeHtml = '';

  get iconSize(): number {
    return this.data.size ?? 24;
  }

  @HostBinding('class')
  get hostClasses(): string {
    return mnIconVariants({
      color: this.data.color,
    });
  }

  private resolvedName: string | null = null;

  ngOnInit(): void {
    const attrs = this.el.nativeElement.attributes;
    for (let i = 0; i < attrs.length; i++) {
      const attr = attrs[i].name.toLowerCase();
      if (attr.startsWith('mnicon')) {
        const iconKey = attr.slice('mnicon'.length);
        for (const key of Object.keys(MN_ICON_MAP)) {
          if (key.toLowerCase() === iconKey) {
            this.resolvedName = key;
            break;
          }
        }
        if (this.resolvedName) break;
      }
    }
    this.updateContent();
  }

  ngOnChanges(): void {
    this.updateContent();
  }

  private updateContent(): void {
    const name = this.data.name ?? this.resolvedName;
    if (name) {
      const raw = MN_ICON_MAP[name] ?? this.registry.get(name);
      this.svgContent = raw ? this.sanitizer.bypassSecurityTrustHtml(raw) : '';
    } else {
      this.svgContent = '';
    }
  }
}
