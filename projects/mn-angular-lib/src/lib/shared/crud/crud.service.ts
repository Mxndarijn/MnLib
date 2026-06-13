import {inject} from '@angular/core';
import {ApiError, FailureResult, QueryParams, Result, ResultMeta, SuccessResult} from './crud.model';
import {catchError, map, Observable, of} from 'rxjs';
import {HttpClient, HttpErrorResponse, HttpParams, HttpResponse, HttpStatusCode} from '@angular/common/http';
import {API_BASE_URL} from './crud.tokens';

/**
 * Configuration for a CRUD service endpoint.
 *
 * Passed to the `CrudService` constructor to define which API
 * resource the service operates on.
 */
export type CrudConfig = {
  endpoint: string;
}

/**
 * Abstract base class for CRUD services.
 * Provides standard HTTP operations with typed `Result<T>` responses.
 *
 * @template TEntity The entity type returned by single-item operations.
 * @template TListResponse The response type for list operations (defaults to `TEntity[]`).
 * @template TCreatePayload The payload type for create operations (defaults to `Partial<TEntity>`).
 * @template TUpdatePayload The payload type for update operations (defaults to `Partial<TEntity>`).
 * @template TId The type of the entity identifier (defaults to `number`).
 * @template TGetByIdResponse The response type for getById (defaults to `TEntity`).
 * @template TCreateResponse The response type for create (defaults to `TEntity`).
 * @template TUpdateResponse The response type for update and patch (defaults to `TEntity`).
 * @template TDeleteResponse The response type for delete (defaults to `void`).
 */
export abstract class CrudService<
  TEntity,
  TListResponse = TEntity[],
  TCreatePayload = Partial<TEntity>,
  TUpdatePayload = Partial<TEntity>,
  TId extends string | number = number,
  TGetByIdResponse = TEntity,
  TCreateResponse = TEntity,
  TUpdateResponse = TEntity,
  TDeleteResponse = void
> {
  protected readonly http = inject(HttpClient);
  protected readonly baseUrl = inject(API_BASE_URL);
  protected readonly endpoint: string;

  protected constructor(config: CrudConfig) {
    this.endpoint = `${this.baseUrl}${config.endpoint}`;
  }

  /**
   * Retrieves all entities from the configured endpoint.
   *
   * Sends a GET request to the base endpoint. Query values are
   * converted to `HttpParams` before the request is sent.
   *
   * @param query Optional query parameters appended to the request URL.
   * @returns An observable emitting a `Result` with the list response or a structured failure.
   */
  getAll(query?: QueryParams): Observable<Result<TListResponse>> {
    return this.http
      .get<TListResponse>(this.endpoint, {
        params: this.toHttpParams(query)
      })
      .pipe(
        map((data) => this.success(data)),
        catchError((error) => of(this.failure(this.mapHttpError(error))))
      );
  }

  /**
   * Retrieves a single entity by its identifier.
   *
   * Sends a GET request to `{endpoint}/{id}`.
   *
   * @param id The unique identifier of the entity to retrieve.
   * @returns An observable emitting a `Result` with the entity or a structured failure.
   */
  getById(id: TId): Observable<Result<TGetByIdResponse>> {
    return this.http
      .get<TGetByIdResponse>(this.itemUrl(id))
      .pipe(
        map((data) => this.success(data)),
        catchError((error) => of(this.failure(this.mapHttpError(error))))
      );
  }

  /**
   * Creates a new entity at the configured endpoint.
   *
   * Sends a POST request with the provided payload as the request body.
   *
   * @param payload The data used to create the entity.
   * @returns An observable emitting a `Result` with the created entity or a structured failure.
   */
  create(payload: TCreatePayload): Observable<Result<TCreateResponse>> {
    return this.http
      .post<TCreateResponse>(this.endpoint, payload)
      .pipe(
        map((data) => this.success(data)),
        catchError((error) => of(this.failure(this.mapHttpError(error))))
      );
  }

  /**
   * Fully replaces an existing entity.
   *
   * Sends a PUT request to `{endpoint}/{id}` with the provided payload,
   * replacing the entire entity.
   *
   * @param id The unique identifier of the entity to update.
   * @param payload The complete data to replace the existing entity with.
   * @returns An observable emitting a `Result` with the updated entity or a structured failure.
   */
  update(id: TId, payload: TUpdatePayload): Observable<Result<TUpdateResponse>> {
    return this.http
      .put<TUpdateResponse>(this.itemUrl(id), payload)
      .pipe(
        map((data) => this.success(data)),
        catchError((error) => of(this.failure(this.mapHttpError(error))))
      );
  }

  /**
   * Partially updates an existing entity.
   *
   * Sends a PATCH request to `{endpoint}/{id}` with the provided payload,
   * merging changes into the existing entity.
   *
   * @param id The unique identifier of the entity to patch.
   * @param payload A partial set of fields to update on the existing entity.
   * @returns An observable emitting a `Result` with the updated entity or a structured failure.
   */
  patch(id: TId, payload: Partial<TUpdatePayload>): Observable<Result<TUpdateResponse>> {
    return this.http
      .patch<TUpdateResponse>(this.itemUrl(id), payload)
      .pipe(
        map((data) => this.success(data)),
        catchError((error) => of(this.failure(this.mapHttpError(error))))
      );
  }

  /**
   * Deletes an entity by its identifier.
   *
   * Sends a DELETE request to `{endpoint}/{id}`.
   *
   * @param id The unique identifier of the entity to delete.
   * @returns An observable emitting a `Result` with the delete response or a structured failure.
   */
  delete(id: TId): Observable<Result<TDeleteResponse>> {
    return this.http
      .delete<TDeleteResponse>(this.itemUrl(id))
      .pipe(
        map((data) => this.success(data)),
        catchError((error) => of(this.failure(this.mapHttpError(error))))
      );
  }

  /**
   * Retrieves all entities with the full `HttpResponse` wrapper.
   *
   * Behaves like {@link getAll} but observes the complete HTTP response,
   * giving access to headers, status code, and URL alongside the body.
   *
   * @param query Optional query parameters appended to the request URL.
   * @returns An observable emitting a `Result` with the full HTTP response or a structured failure.
   */
  getAllResponse(query?: QueryParams): Observable<Result<HttpResponse<TListResponse>>> {
    return this.http
      .get<TListResponse>(this.endpoint, {
        params: this.toHttpParams(query),
        observe: 'response',
      })
      .pipe(
        map((response) =>
          this.success(response, {
            statusCode: response.status,
            headers: response.headers,
            url: response.url ?? undefined,
          })
        ),
        catchError((error) => of(this.failure(this.mapHttpError(error))))
      );
  }

  /**
   * Builds the URL for a single entity by appending the identifier to the endpoint.
   *
   * @param id The unique identifier to append.
   * @returns The full URL targeting the specific entity.
   */
  protected itemUrl(id: TId): string {
    return `${this.endpoint}/${id}`;
  }

  /**
   * Wraps a value in a `SuccessResult`.
   *
   * @template T The type of the response data.
   * @param data The response data to wrap.
   * @param meta Optional metadata (status code, headers, URL) to attach.
   * @returns A `SuccessResult` containing the provided data.
   */
  protected success<T>(data: T, meta?: ResultMeta): SuccessResult<T> {
    return {ok: true, data, meta};
  }

  /**
   * Wraps an error in a `FailureResult`.
   *
   * When no explicit metadata is provided, metadata is derived from
   * the `ApiError` itself (status code, headers, URL).
   *
   * @param error The structured API error.
   * @param meta Optional metadata to override the error-derived values.
   * @returns A `FailureResult` containing the error and metadata.
   */
  protected failure(error: ApiError, meta?: ResultMeta): FailureResult {
    return {
      ok: false,
      error,
      meta: meta ?? {
        statusCode: error.status ?? undefined,
        headers: error.headers,
        url: error.url ?? undefined,
      },
    };
  }

  /**
   * Maps an unknown error into a structured `ApiError`.
   *
   * Handles both `HttpErrorResponse` instances and unexpected error types.
   * Extracts backend messages, validation errors, and retry information
   * so callers receive a consistent error shape.
   *
   * @param error The raw error caught from the HTTP pipeline.
   * @returns A fully populated `ApiError` object.
   */
  protected mapHttpError(error: unknown): ApiError {
    const timestamp = new Date().toISOString();

    if (!(error instanceof HttpErrorResponse)) {
      return {
        status: null,
        message: 'Unknown error',
        original: error instanceof Error ? error : new Error(String(error)),
        retryable: false,
        timestamp,
      };
    }

    const status = this.normalizeStatus(error.status);
    const details = error.error;
    const backendMessage = this.extractBackendMessage(details);
    const validationErrors = this.extractValidationErrors(details);

    return {
      status,
      message: backendMessage ?? this.defaultMessage(status),
      details,
      backendMessage,
      validationErrors,
      url: error.url,
      headers: error.headers,
      original: error,
      retryable: this.isRetryable(status),
      timestamp,
    };
  }

  /**
   * Extracts a human-readable message from the error response body.
   *
   * Checks common keys (`message`, `title`, `detail`, `error`) on the
   * body object and returns the first non-empty string found.
   *
   * @param body The parsed error response body.
   * @returns The extracted message, or `undefined` if none was found.
   */
  protected extractBackendMessage(body: unknown): string | undefined {
    if (typeof body === 'string' && body.trim()) {
      return body;
    }

    if (!body || typeof body !== 'object') {
      return undefined;
    }

    const obj = body as Record<string, unknown>;

    for (const key of ['message', 'title', 'detail', 'error']) {
      const value = obj[key];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }
    return undefined;
  }

  /**
   * Extracts field-level validation errors from the error response body.
   *
   * Expects an `errors` property on the body containing a record of
   * field names to error messages (string or string array).
   *
   * @param body The parsed error response body.
   * @returns A record mapping field names to their error messages, or `undefined` if none were found.
   */
  protected extractValidationErrors(body: unknown): Record<string, string[]> | undefined {
    if (!body || typeof body !== 'object') {
      return undefined;
    }

    const obj = body as Record<string, unknown>;
    const errors = obj['errors'];

    if (!errors || typeof errors !== 'object') {
      return undefined;
    }

    const result: Record<string, string[]> = {};

    for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        result[key] = value.map(String);
      } else if (typeof value === 'string') {
        result[key] = [value];
      }
    }
    return Object.keys(result).length ? result : undefined;
  }

  /**
   * Returns a default user-facing message for the given HTTP status code.
   *
   * Provides human-readable messages for common HTTP status codes.
   * Override this method to customise messages.
   *
   * @param status The HTTP status code, or `null` when unknown.
   * @returns A descriptive error message.
   */
  protected defaultMessage(status: HttpStatusCode | null): string {
    switch (status) {
      case HttpStatusCode.BadRequest:
        return 'Bad request';
      case HttpStatusCode.Unauthorized:
        return 'Unauthorized';
      case HttpStatusCode.Forbidden:
        return 'Forbidden';
      case HttpStatusCode.NotFound:
        return 'Not found';
      case HttpStatusCode.Conflict:
        return 'Conflict';
      case HttpStatusCode.UnprocessableEntity:
        return 'Unprocessable entity';
      case HttpStatusCode.InternalServerError:
        return 'Internal server error';
      case null:
        return 'Unknown error';
      default:
        return `Request failed with status ${status}`;
    }
  }

  /**
   * Determines whether a request with the given status can be retried.
   *
   * Timeouts, rate-limiting responses, and server errors
   * (5xx) are considered retryable by default.
   *
   * @param status The HTTP status code, or `null` when unknown.
   * @returns `true` if the request is safe to retry.
   */
  protected isRetryable(status: HttpStatusCode | null): boolean {
    if (status === HttpStatusCode.RequestTimeout) return true;
    if (status === HttpStatusCode.TooManyRequests) return true;
    if (typeof status === 'number' && status >= 500) return true;
    return false;
  }

  /**
   * Normalises a raw HTTP status into an `HttpStatusCode | null` value.
   *
   * Converts `undefined`, `NaN`, and `0` (network error) to `null`
   * so downstream code only needs to handle `HttpStatusCode | null`.
   *
   * @param status The raw status value from the HTTP response.
   * @returns The normalised status code, or `null` when indeterminate.
   */
  protected normalizeStatus(status: number | null | undefined): HttpStatusCode | null {
    if (status === null || status === undefined || status === 0 || Number.isNaN(status)) return null;
    return status as HttpStatusCode;
  }

  /**
   * Converts query parameters into Angular `HttpParams`.
   *
   * `null` and `undefined` values are silently skipped.
   * Array values are appended as multiple entries for the same key.
   *
   * @param query The query parameter record to convert.
   * @returns An `HttpParams` instance, or `undefined` when no parameters are provided.
   */
  protected toHttpParams(query?: QueryParams): HttpParams | undefined {
    if (!query) return undefined;

    let params = new HttpParams();

    for (const [key, rawValue] of Object.entries(query)) {
      if (rawValue === null || rawValue === undefined) continue;

      const values = Array.isArray(rawValue) ? rawValue : [rawValue];

      for (const value of values) {
        if (value === null || value === undefined) continue;
        params = params.append(key, String(value));
      }
    }
    return params;
  }
}
