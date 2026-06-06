import { Component, HostBinding, Input, OnChanges, OnInit, inject, ElementRef } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MnIconTypes } from './mn-iconTypes';
import { mnIconVariants } from './mn-iconVariants';
import { MN_ICON_MAP } from './mn-icon-map';

@Component({
  selector: 'mn-icon',
  standalone: true,
  templateUrl: './mn-icon.html',
})
export class MnIcon implements OnChanges, OnInit {
  @Input() data: Partial<MnIconTypes> = {};

  private sanitizer = inject(DomSanitizer);
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
      const raw = MN_ICON_MAP[name];
      if (raw) {
        const size = this.iconSize;
        const isFullSvg = raw.trim().startsWith('<svg');
        if (isFullSvg) {
          const sized = raw.replace(/<svg([^>]*)>/, (_match: string, attrs: string) => {
            let updated = attrs.replace(/width="[^"]*"/, `width="${size}"`);
            updated = updated.replace(/height="[^"]*"/, `height="${size}"`);
            if (!attrs.includes('width=')) updated += ` width="${size}"`;
            if (!attrs.includes('height=')) updated += ` height="${size}"`;
            return `<svg${updated}>`;
          });
          this.svgContent = this.sanitizer.bypassSecurityTrustHtml(sized);
        } else {
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${raw}</svg>`;
          this.svgContent = this.sanitizer.bypassSecurityTrustHtml(svg);
        }
      } else {
        this.svgContent = '';
      }
    } else {
      this.svgContent = '';
    }
  }
}
