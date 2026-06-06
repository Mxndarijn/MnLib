import { Injectable } from '@angular/core';

export interface MnIconDefinition {
  name: string;
  svg: string;
}

@Injectable({ providedIn: 'root' })
export class MnIconRegistry {
  private icons = new Map<string, string>();

  register(...icons: MnIconDefinition[]): void {
    for (const icon of icons) {
      this.icons.set(icon.name, icon.svg);
    }
  }

  get(name: string): string | undefined {
    return this.icons.get(name);
  }

  has(name: string): boolean {
    return this.icons.has(name);
  }
}

export function mnIconDef(name: string, svg: string): MnIconDefinition {
  return { name, svg };
}
