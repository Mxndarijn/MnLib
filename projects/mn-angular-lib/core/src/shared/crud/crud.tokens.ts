import { InjectionToken } from '@angular/core';

/**
 * Injection token for the base URL used by all CRUD service requests.
 *
 * Provide this token at the application or module level to configure
 * the root API URL that `CrudService` prepends to every endpoint.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');
