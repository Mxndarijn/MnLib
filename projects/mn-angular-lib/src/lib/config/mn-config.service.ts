import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MnConfigFile } from './mn-config.types';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

@Injectable({ providedIn: 'root' })
export class MnConfigService {
  private _config: MnConfigFile | null = null;

  constructor(private readonly http: HttpClient) {}

  /**
   * Load the configuration JSON from the provided URL and cache it in memory.
   * Consumers should typically call this via the APP_INITIALIZER helper.
   */
  async load(url: string): Promise<void> {
    let json = await firstValueFrom(this.http.get<unknown>(url, { responseType: 'json' as const }));
    if (typeof json === 'string') {
      try {
        json = JSON.parse(json);
      } catch {
        json = {};
      }
    }
    const cfg = (isPlainObject(json) ? json : {}) as any;
    const defaults = (isPlainObject(cfg.defaults) ? cfg.defaults : {}) as Record<string, unknown>;
    const overrides = isPlainObject(cfg.overrides) ? cfg.overrides : cfg.overrides ?? {};
    this._config = { defaults, overrides };
  }

  /**
   * Resolve a configuration object for a component, optionally scoped to a section path
   * and optionally overridden by an instance id.
   */
  resolve<T extends object = any>(
    componentName: string,
    sectionPath: string[] = [],
    instanceId?: string,
  ): T {
    const baseConfig: Record<string, unknown> = isPlainObject(this._config?.defaults)
      ? (isPlainObject((this._config as MnConfigFile).defaults[componentName])
          ? { ...(this._config as MnConfigFile).defaults[componentName] as Record<string, unknown> }
          : {})
      : {};

    const leaf = this.walkOverrides(this._config?.overrides ?? {}, sectionPath);

    let resolved: Record<string, unknown> = baseConfig;

    if (leaf && isPlainObject((leaf as any)[componentName])) {
      resolved = this.deepMerge(resolved, (leaf as any)[componentName] as Record<string, unknown>);
    }

    if (instanceId) {
      const instKey = `#${instanceId}`;
      if (leaf && isPlainObject((leaf as any)[instKey])) {
        resolved = this.deepMerge(resolved, (leaf as any)[instKey] as Record<string, unknown>);
      }
    }

    return resolved as T;
  }

  /**
   * Walk the overrides nested object using the provided section path and return the leaf node.
   * If any segment is missing or the current node is not a plain object, returns undefined.
   */
  walkOverrides(overridesRoot: unknown, sectionPath: string[]): unknown | undefined {
    let node: unknown = overridesRoot;
    for (const segment of sectionPath) {
      if (!isPlainObject(node)) return undefined;
      node = (node as Record<string, unknown>)[segment];
      if (node === undefined) return undefined;
    }
    return node;
  }

  /**
   * Deep merge two plain-object trees. Arrays and non-plain values are replaced by the patch.
   * Does not mutate inputs; returns a new object.
   */
  deepMerge<A extends Record<string, any>, B extends Record<string, any>>(base: A, patch: B): A & B {
    const out: Record<string, any> = { ...base };
    for (const key of Object.keys(patch)) {
      const bVal = (base as any)[key];
      const pVal = (patch as any)[key];

      if (isPlainObject(bVal) && isPlainObject(pVal)) {
        out[key] = this.deepMerge(bVal, pVal);
      } else {
        // replace for arrays, primitives, null, undefined, and non-plain objects
        out[key] = pVal;
      }
    }
    return out as A & B;
  }
}
