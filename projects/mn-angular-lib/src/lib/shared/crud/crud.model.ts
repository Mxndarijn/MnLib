import {HttpErrorResponse, HttpHeaders} from '@angular/common/http';

/** Represents a network error where no response was received from the server. */
export const NETWORK_ERROR_STATUS = 0 as const;

/**
 * Represents the numeric status of an API call.
 * - A positive number — the HTTP status code (e.g. 400, 404, 500).
 * - `0` — a network error (no response received, e.g. timeout or offline).
 * - `null` — status is unknown or not yet determined.
 */
export type ApiStatus = number | null;

/**
 * A structured representation of an API error, capturing all relevant
 * details for logging, display, and retry logic.
 */
export interface ApiError {
  /** The HTTP error status or network error indicator. */
  status: ApiStatus;
  /** A readable error message suitable for display. */
  message: string;
  /** Additional error details, if available. */
  details?: unknown;
  /** The raw error message returned by the backend, if any. */
  backendMessage?: string;
  /** Field-level validation errors keyed by field name. */
  validationErrors?: Record<string, string[]>;
  /** The request URL that produced the error. */
  url?: string | null;
  /** The response headers associated with the error. */
  headers?: HttpHeaders;
  /** The original error object before transformation. */
  original: HttpErrorResponse | Error;
  /** Whether the failed request can be retried. */
  retryable: boolean;
  /** ISO timestamp of when the error occurred. */
  timestamp: string;
}

/**
 * Metadata associated with a successful API response.
 */
export interface ResultMeta {
  /** The numeric HTTP status code (e.g. 200, 201). */
  statusCode?: number;
  /** The response headers. */
  headers?: HttpHeaders;
  /** The final response URL (may differ from the request URL after redirects). */
  url?: string;
}

/**
 * Represents a successful API result containing the response data.
 * @template T The type of the response data.
 */
export interface SuccessResult<T> {
  ok: true;
  data: T;
  meta?: ResultMeta;
}

/**
 * Represents a failed API result containing the structured error.
 */
export interface FailureResult {
  ok: false;
  error: ApiError;
  meta?: ResultMeta;
}

/**
 * A discriminated union representing either a successful or failed API result.
 * Use `result.ok` to narrow the type:
 * ```ts
 * if (result.ok) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error.message);
 * }
 * ```
 * @template T The type of the response data on success.
 */
export type Result<T> = SuccessResult<T> | FailureResult;

/** A JavaScript primitive value. */
export type Primitive = string | number | boolean | null | undefined;

/** A value that can be used as a query parameter — a single primitive or an array of primitives. */
export type QueryValue = Primitive | Primitive[];

/** A record of query parameter key-value pairs. */
export type QueryParams = Record<string, QueryValue>;
