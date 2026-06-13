import {HttpErrorResponse, HttpHeaders, HttpStatusCode} from '@angular/common/http';

/**
 * A structured representation of an API error.
 *
 * Captures all relevant details — status, message, validation errors,
 * and retry information — so consumers can log, display, or act on
 * failures without inspecting the raw HTTP response.
 */
export type ApiError = {
  status: HttpStatusCode | null;
  message: string;
  details?: unknown;
  backendMessage?: string;
  validationErrors?: Record<string, string[]>;
  url?: string | null;
  headers?: HttpHeaders;
  original: HttpErrorResponse | Error;
  retryable: boolean;
  timestamp: string;
}

/**
 * Metadata associated with an API result.
 *
 * Attached to both `SuccessResult` and `FailureResult` to provide
 * transport-level details such as the HTTP status code, response
 * headers, and the final URL after any redirects.
 */
export type ResultMeta = {
  statusCode?: number;
  headers?: HttpHeaders;
  url?: string;
}

/**
 * Represents a successful API result containing the response data.
 *
 * Discriminated by `ok: true`. Use `result.ok` to narrow the union
 * before accessing `data`.
 *
 * @template T The type of the response data.
 */
export type SuccessResult<T> = {
  ok: true;
  data: T;
  meta?: ResultMeta;
}

/**
 * Represents a failed API result containing the structured error.
 *
 * Discriminated by `ok: false`. Use `result.ok` to narrow the union
 * before accessing `error`.
 */
export type FailureResult = {
  ok: false;
  error: ApiError;
  meta?: ResultMeta;
}

/**
 * A discriminated union representing either a successful or failed API result.
 *
 * Discriminated by `ok`. Use `result.ok` to narrow the type
 * before accessing `data` or `error`.
 *
 * @template T The type of the response data on success.
 */
export type Result<T> = SuccessResult<T> | FailureResult;

/**
 * A JavaScript primitive value.
 *
 * Used as the building block for query parameter values.
 */
export type Primitive = string | number | boolean | null | undefined;

/**
 * A value that can be used as a query parameter.
 *
 * Either a single primitive or an array of primitives.
 * Array values are appended as multiple entries for the same key.
 */
export type QueryValue = Primitive | Primitive[];

/**
 * A record of query parameter key-value pairs.
 *
 * Passed to CRUD service methods and converted to `HttpParams`
 * before the request is sent. `null` and `undefined` values
 * are silently skipped during conversion.
 */
export type QueryParams = Record<string, QueryValue>;
