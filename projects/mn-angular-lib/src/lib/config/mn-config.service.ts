import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MnConfigFile } from './mn-config.types';
import { MnLanguageService } from '../language/mn-language.service';
import { isTranslatable, MnLanguageConfig } from '../language/mn-language.types';
import JSON5 from 'json5';

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
  private _debugMode = false;

  private readonly lang = inject(MnLanguageService);

  constructor(private readonly http: HttpClient) {}

  /**
   * Load the configuration JSON from the provided URL and cache it in memory.
   * Consumers should typically call this via the APP_INITIALIZER helper.
   */
  async load(url: string, debugMode = false): Promise<void> {
    this._debugMode = debugMode;
    let text: string;

    try {
      text = await firstValueFrom(
        this.http.get(url, { responseType: 'text' })
      );
    } catch (err) {
      console.warn(`[MnConfig] Failed to load config from ${url}`, err);
      this._config = { defaults: {}, overrides: {} };
      return;
    }

    let json: unknown;

    try {
      json = JSON5.parse(text);
    } catch (err) {
      console.warn(`[MnConfig] Failed to parse JSON5 from ${url}`, err, text);
      json = {};
    }

    const cfg = (isPlainObject(json) ? json : {}) as any;
    const defaults = isPlainObject(cfg.defaults) ? cfg.defaults : {};
    const overrides = isPlainObject(cfg.overrides) ? cfg.overrides : cfg.overrides ?? {};

    this._config = { defaults, overrides };

    // Bootstrap language service from config if a "language" section is present.
    // This avoids circular dependency: config reads raw language settings and
    // pushes them into the language service (language service never imports config).
    const langCfg = cfg.language;
    if (isPlainObject(langCfg) && typeof langCfg['urlPattern'] === 'string') {
      const lc = langCfg as unknown as MnLanguageConfig;
      this.lang.configure(lc.urlPattern);
      const localesToLoad = lc.preload ?? [lc.defaultLocale];
      await Promise.all(localesToLoad.map(l => this.lang.loadLocale(l)));
      await this.lang.setLocale(lc.defaultLocale);
    }
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

    if (this._debugMode) {
      console.debug(`[MnConfig] Resolving for ${componentName}`, {
        sectionPath,
        instanceId,
        resolved,
      });
    }

    return this.resolveTranslatables(resolved) as T;
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
   * Recursively walk a resolved config object and replace any `{ $translate: "key" }` markers
   * with their translated values from MnLanguageService.
   */
  private resolveTranslatables(obj: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (isTranslatable(value)) {
        out[key] = this.lang.translate(value.$translate, value.params);
      } else if (Array.isArray(value)) {
        out[key] = value.map(item => {
          if (isTranslatable(item)) {
            return this.lang.translate(item.$translate, item.params);
          } else if (isPlainObject(item)) {
            return this.resolveTranslatables(item as Record<string, unknown>);
          }
          return item;
        });
      } else if (isPlainObject(value)) {
        out[key] = this.resolveTranslatables(value as Record<string, unknown>);
      } else {
        out[key] = value;
      }
    }
    return out;
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
