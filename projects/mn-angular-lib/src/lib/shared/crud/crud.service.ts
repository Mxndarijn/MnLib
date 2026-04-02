import {inject} from '@angular/core';
import {ApiError, ApiStatus, FailureResult, NETWORK_ERROR_STATUS, QueryParams, Result, ResultMeta, SuccessResult} from './crud.model';
import {catchError, map, Observable, of} from 'rxjs';
import {HttpClient, HttpErrorResponse, HttpParams, HttpResponse, HttpStatusCode} from '@angular/common/http';
import {API_BASE_URL} from './crud.tokens';

/** Configuration for a CRUD service endpoint. */
export interface CrudConfig {
  /** The API endpoint path (appended to the base URL). */
  endpoint: string;
}

/**
 * Abstract base class for CRUD services.
 * Provides standard HTTP operations with typed `Result<T>` responses.
 *
 * @template TEntity The entity type returned by single-item operations.
 * @template TListResponse The response type for list operations (defaults to `TEntity[]`).
 * @template TCreateResponse The payload type for create operations (defaults to `Partial<TEntity>`).
 * @template TUpdateResponse The payload type for update operations (defaults to `Partial<TEntity>`).
 * @template TId The type of the entity identifier (defaults to `number`).
 */
export abstract class CrudService<
  TEntity,
  TListResponse = TEntity[],
  TCreateResponse = Partial<TEntity>,
  TUpdateResponse = Partial<TEntity>,
  TId extends string | number = number
> {
  protected readonly http = inject(HttpClient);
  protected readonly baseUrl = inject(API_BASE_URL);
  protected readonly endpoint: string;

  protected constructor(config: CrudConfig) {
    this.endpoint = `${this.baseUrl}${config.endpoint}`;
  }

  /** Fetches all entities, optionally filtered by query parameters. */
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

  /** Fetches a single entity by its identifier. */
  getById(id: TId): Observable<Result<TEntity>> {
    return this.http
      .get<TEntity>(this.itemUrl(id))
      .pipe(
        map((data) => this.success(data)),
        catchError((error) => of(this.failure(this.mapHttpError(error))))
      );
  }

  /** Creates a new entity. */
  create(payload: TCreateResponse): Observable<Result<TEntity>> {
    return this.http
      .post<TEntity>(this.endpoint, payload)
      .pipe(
        map((data) => this.success(data)),
        catchError((error) => of(this.failure(this.mapHttpError(error))))
      );
  }

  /** Fully updates an existing entity. */
  update(id: TId, payload: TUpdateResponse): Observable<Result<TEntity>> {
    return this.http
      .put<TEntity>(this.itemUrl(id), payload)
      .pipe(
        map((data) => this.success(data)),
        catchError((error) => of(this.failure(this.mapHttpError(error))))
      );
  }

  /** Partially updates an existing entity. */
  patch(id: TId, payload: Partial<TUpdateResponse>): Observable<Result<TEntity>> {
    return this.http
      .patch<TEntity>(this.itemUrl(id), payload)
      .pipe(
        map((data) => this.success(data)),
        catchError((error) => of(this.failure(this.mapHttpError(error))))
      );
  }

  /** Deletes an entity by its identifier. */
  delete(id: TId): Observable<Result<void>> {
    return this.http
      .delete<void>(this.itemUrl(id))
      .pipe(
        map(() => this.success<void>(undefined)),
        catchError((error) => of(this.failure(this.mapHttpError(error))))
      );
  }

  /** Fetches all entities with the full `HttpResponse` wrapper, including headers and status. */
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

  /** Builds the URL for a single entity by appending the id to the endpoint. */
  protected itemUrl(id: TId): string {
    return `${this.endpoint}/${id}`;
  }

  /** Wraps data in a `SuccessResult`. */
  protected success<T>(data: T, meta?: ResultMeta): SuccessResult<T> {
    return {ok: true, data, meta};
  }

  /** Wraps an error in a `FailureResult`, deriving meta from the error if not provided. */
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

  /** Maps an unknown error into a structured `ApiError`. */
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

  /** Extracts a message from the error response body. */
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

  /** Extracts field-level validation errors from the error response body. */
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

  /** Returns a default user-facing message for the given API status. */
  protected defaultMessage(status: ApiStatus): string {
    switch (status) {
      case NETWORK_ERROR_STATUS:
        return 'Network error';
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

  /** Determines whether a request with the given status can be retried. */
  protected isRetryable(status: ApiStatus): boolean {
    if (status === NETWORK_ERROR_STATUS) return true;
    if (status === HttpStatusCode.RequestTimeout) return true;
    if (status === HttpStatusCode.TooManyRequests) return true;
    if (typeof status === 'number' && status >= 500) return true;
    return false;
  }

  /** Normalizes a raw HTTP status into a consistent `number | null` value. */
  protected normalizeStatus(status: number | null | undefined): number | null {
    if (status === NETWORK_ERROR_STATUS) return NETWORK_ERROR_STATUS;
    if (status === null || status === undefined || Number.isNaN(status)) return null;
    return status;
  }

  /** Converts query parameters into Angular `HttpParams`. */
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
