import { InjectionToken, InjectionToken as IT } from '@angular/core';

export interface ComponentConfigEntry<T> {
  key: string;                 // Unique component key, e.g., 'mn-alert'
  token: IT<T>;                // Injection token to provide effective config
  defaultValue: T;             // Library defaults
  schema?: object;             // Optional JSON Schema (for editors/validation)
}

export const MN_CONFIG_REGISTRY = new InjectionToken<ComponentConfigEntry<any>[]>('MN_CONFIG_REGISTRY');
