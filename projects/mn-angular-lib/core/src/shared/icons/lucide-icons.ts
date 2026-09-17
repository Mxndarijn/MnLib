import type { LucideIconData } from '@lucide/angular';
import type { IconNode } from 'lucide';

/**
 * Turns icon nodes from the vanilla `lucide` package into the icon data that
 * `<svg [lucideIcon]>` (`LucideDynamicIcon`) and MnLib's icon inputs accept.
 *
 * Why not `@lucide/angular`'s per-icon components (`<svg lucideArrowLeft>`): that
 * package is a single module, and the Angular linker compiles a full copy of the
 * SVG template into every icon class, so each icon cost ~2.8 kB and all of them
 * landed in the startup chunk. With `lucide` an icon is a few hundred bytes of data, and
 * only the icons something imports are bundled. esbuild keeps all of them in one shared
 * chunk (they hang off the package's re-export barrel), about 30 kB for the whole app.
 *
 * Import the namespace and name each icon, so an icon called `Component`, `Map`
 * or `X` never shadows another import:
 *
 * ```ts
 * import * as lucide from 'lucide';
 * const ICONS = lucideIcons({ ArrowLeft: lucide.ArrowLeft, Trash2: lucide.Trash2 });
 * // template: <svg [lucideIcon]="icons.ArrowLeft" [size]="16"></svg>
 * ```
 *
 * @param nodes Icon nodes keyed by their PascalCase `lucide` export name.
 * @returns Icon data under the same keys, named `arrow-left`-style for the
 * `lucide-<name>` class the icon renders with.
 */
export function lucideIcons<K extends string>(nodes: Record<K, IconNode>): Record<K, LucideIconData> {
  const icons = {} as Record<K, LucideIconData>;
  for (const key of Object.keys(nodes) as K[]) {
    // `lucide` types attribute values as optional; its generated icon data never omits one.
    icons[key] = { name: toKebabCase(key), node: nodes[key] as LucideIconData['node'] };
  }
  return icons;
}

/**
 * Converts a PascalCase export name to Lucide's kebab-case icon name.
 * @param name Export name, e.g. `CircleCheck` or `Trash2`.
 * @returns The icon name, e.g. `circle-check` or `trash-2`.
 */
function toKebabCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([a-zA-Z])(\d)/g, '$1-$2')
    .toLowerCase();
}
