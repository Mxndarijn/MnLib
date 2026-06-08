import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { CrudService } from './crud.service';
import { API_BASE_URL } from './crud.tokens';
import { HttpClient, HttpErrorResponse, HttpStatusCode, provideHttpClient } from '@angular/common/http';

interface TestEntity {
  id: number;
  name: string;
}

class TestCrudService extends CrudService<TestEntity> {
  constructor() {
    super({ endpoint: '/test' });
  }
}

describe('CrudService', () => {
  let service: TestCrudService;
  let httpMock: HttpTestingController;
  const baseUrl = 'https://api.example.com';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TestCrudService,
        { provide: API_BASE_URL, useValue: baseUrl }
      ]
    });

    service = TestBed.inject(TestCrudService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should construct the correct endpoint URL', () => {
    expect((service as any).endpoint).toBe(`${baseUrl}/test`);
  });

  describe('getAll', () => {
    it('should return a list of entities on success', () => {
      const mockData: TestEntity[] = [{ id: 1, name: 'Test' }];

      service.getAll().subscribe(result => {
        expect(result.ok).toBeTrue();
        if (result.ok) {
          expect(result.data).toEqual(mockData);
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/test`);
      expect(req.request.method).toBe('GET');
      req.flush(mockData);
    });

    it('should handle query parameters', () => {
      service.getAll({ search: 'term', active: true, tags: ['a', 'b'] }).subscribe();

      const req = httpMock.expectOne(request =>
        request.url === `${baseUrl}/test` &&
        request.params.get('search') === 'term' &&
        request.params.get('active') === 'true' &&
        (request.params.getAll('tags')?.includes('a') ?? false) &&
        (request.params.getAll('tags')?.includes('b') ?? false)
      );
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('should return a failure result on error', () => {
      service.getAll().subscribe(result => {
        expect(result.ok).toBeFalse();
        if (!result.ok) {
          expect(result.error.status).toBe(HttpStatusCode.InternalServerError);
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/test`);
      req.flush('Error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('getById', () => {
    it('should return a single entity', () => {
      const mockData: TestEntity = { id: 1, name: 'Test' };

      service.getById(1).subscribe(result => {
        expect(result.ok).toBeTrue();
        if (result.ok) {
          expect(result.data).toEqual(mockData);
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/test/1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockData);
    });
  });

  describe('create', () => {
    it('should send a POST request with payload', () => {
      const payload: Partial<TestEntity> = { name: 'New' };
      const mockResponse: TestEntity = { id: 1, name: 'New' };

      service.create(payload).subscribe(result => {
        expect(result.ok).toBeTrue();
        if (result.ok) {
          expect(result.data).toEqual(mockResponse);
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/test`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(mockResponse);
    });
  });

  describe('update', () => {
    it('should send a PUT request', () => {
      const payload: Partial<TestEntity> = { name: 'Updated' };
      service.update(1, payload).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/test/1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(payload);
      req.flush({});
    });
  });

  describe('patch', () => {
    it('should send a PATCH request', () => {
      const payload: Partial<TestEntity> = { name: 'Patched' };
      service.patch(1, payload).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/test/1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(payload);
      req.flush({});
    });
  });

  describe('delete', () => {
    it('should send a DELETE request', () => {
      service.delete(1).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/test/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('Error Mapping', () => {
    it('should extract backend message from error body', () => {
      const errorBody = { message: 'Backend Error Message' };
      const errorResponse = new HttpErrorResponse({
        error: errorBody,
        status: 400,
        statusText: 'Bad Request'
      });

      const mapped = (service as any).mapHttpError(errorResponse);
      expect(mapped.backendMessage).toBe('Backend Error Message');
    });

    it('should extract validation errors', () => {
      const errorBody = {
        errors: {
          email: ['Invalid format', 'Too short'],
          password: ['Required']
        }
      };
      const errorResponse = new HttpErrorResponse({
        error: errorBody,
        status: 422,
        statusText: 'Unprocessable Entity'
      });

      const mapped = (service as any).mapHttpError(errorResponse);
      expect(mapped.validationErrors).toEqual(errorBody.errors);
    });

    it('should identify retryable errors', () => {
      const retryableStatuses = [
        HttpStatusCode.RequestTimeout,
        HttpStatusCode.TooManyRequests,
        HttpStatusCode.InternalServerError,
        HttpStatusCode.BadGateway,
        HttpStatusCode.ServiceUnavailable,
        HttpStatusCode.GatewayTimeout
      ];

      retryableStatuses.forEach(status => {
        const errorResponse = new HttpErrorResponse({ status });
        const mapped = (service as any).mapHttpError(errorResponse);
        expect(mapped.retryable).toBeTrue();
      });

      const nonRetryable = new HttpErrorResponse({ status: 400 });
      expect((service as any).mapHttpError(nonRetryable).retryable).toBeFalse();
    });
  });

  describe('toHttpParams', () => {
    it('should convert QueryParams to HttpParams', () => {
      const query = {
        page: 1,
        filter: 'test',
        tags: ['a', 'b'],
        empty: null,
        missing: undefined
      };

      const params = (service as any).toHttpParams(query);
      expect(params.get('page')).toBe('1');
      expect(params.get('filter')).toBe('test');
      expect(params.getAll('tags')).toEqual(['a', 'b']);
      expect(params.has('empty')).toBeFalse();
      expect(params.has('missing')).toBeFalse();
    });
  });
});
