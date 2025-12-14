import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MN_CONFIG_REGISTRY, ComponentConfigEntry } from './config-registry';

@Injectable({ providedIn: 'root' })
export class MnConfigService {
  private http = inject(HttpClient);
  private entries = inject(MN_CONFIG_REGISTRY, { optional: true }) ?? [];

  // Basic options
  readonly baseUrl = signal<string>('http://127.0.0.1:5000');
  readonly tenant = signal<string>('default');
  readonly env = signal<string>('dev');

  // Last loaded effective overrides from server
  private serverEffective = signal<Record<string, any>>({});

  async configure(opts: { baseUrl?: string; tenant?: string; env?: string }) {
    if (opts.baseUrl) this.baseUrl.set(opts.baseUrl);
    if (opts.tenant) this.tenant.set(opts.tenant);
    if (opts.env) this.env.set(opts.env);
    console.log('[MnConfigService] configure', { baseUrl: this.baseUrl(), tenant: this.tenant(), env: this.env() });
  }

  async loadAllEffective(ctx?: { route?: string; page?: string }) {
    let params = new HttpParams().set('tenant', this.tenant()).set('env', this.env());
    if (ctx?.route) params = params.set('route', ctx.route);
    if (ctx?.page) params = params.set('page', ctx.page);

    const url = `${this.baseUrl()}/api/mn-config`;
    console.log('[MnConfigService] GET', url, 'params=', params.toString());
    const result = await firstValueFrom(this.http.get<Record<string, any>>(url, { params }));
    console.log('[MnConfigService] serverEffective loaded:', result);
    this.serverEffective.set(result ?? {});
  }

  effective<T>(key: string): T {
    const entry = (this.entries as ComponentConfigEntry<any>[]).find(e => e.key === key);
    if (!entry) {
      console.warn('[MnConfigService] No registry entry for key', key);
      return {} as T;
    }
    const serverPart = this.serverEffective()[key] ?? {};
    const merged = deepMerge(entry.defaultValue, serverPart) as T;
    console.log('[MnConfigService] effective(', key, ') =', merged, '\n default=', entry.defaultValue, '\n server=', serverPart);
    return merged;
  }
}

export function deepMerge<T>(base: T, override: Partial<T>): T {
  if (override == null) return base as T;
  if (Array.isArray(base) || Array.isArray(override)) return (override as any) ?? (base as any);
  if (typeof base !== 'object' || typeof override !== 'object' || !base || !override) return (override as any) ?? (base as any);
  const out: any = { ...base };
  for (const k of Object.keys(override)) out[k] = deepMerge((base as any)[k], (override as any)[k]);
  return out;
}
