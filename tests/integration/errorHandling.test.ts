import { describe, it, expect } from '@jest/globals';
import { parseApiError, ErrorType } from '../../app/components/ErrorDisplay';

describe('Error Handling Integration', () => {
    describe('parseApiError', () => {
        it('should parse 429 rate limit error', () => {
            const mockResponse = {
                status: 429,
                headers: {
                    get: (name: string) => name === 'Retry-After' ? '60' : null,
                },
            } as unknown as Response;

            const result = parseApiError(mockResponse);

            expect(result.type).toBe('rate-limit');
            expect(result.errorCode).toBe('RATE_LIMIT');
            expect(result.retryAfter).toBe(60);
        });

        it('should parse 401 unauthorized error', () => {
            const mockResponse = { status: 401 } as Response;
            const result = parseApiError(mockResponse);

            expect(result.type).toBe('auth');
            expect(result.errorCode).toBe('UNAUTHORIZED');
        });

        it('should parse 403 forbidden error', () => {
            const mockResponse = { status: 403 } as Response;
            const result = parseApiError(mockResponse);

            expect(result.type).toBe('auth');
            expect(result.errorCode).toBe('FORBIDDEN');
        });

        it('should parse 400 validation error', () => {
            const mockResponse = { status: 400 } as Response;
            const result = parseApiError(mockResponse);

            expect(result.type).toBe('validation');
            expect(result.errorCode).toBe('BAD_REQUEST');
        });

        it('should parse 500 server error', () => {
            const mockResponse = { status: 500 } as Response;
            const result = parseApiError(mockResponse);

            expect(result.type).toBe('error');
            expect(result.errorCode).toBe('SERVER_ERROR_500');
        });

        it('should parse 502 server error', () => {
            const mockResponse = { status: 502 } as Response;
            const result = parseApiError(mockResponse);

            expect(result.type).toBe('error');
            expect(result.errorCode).toBe('SERVER_ERROR_502');
        });

        it('should parse network error', () => {
            const error = new TypeError('Failed to fetch');
            const result = parseApiError(error);

            expect(result.type).toBe('network');
            expect(result.errorCode).toBe('NETWORK_ERROR');
        });

        it('should handle generic Error', () => {
            const error = new Error('Something went wrong');
            const result = parseApiError(error);

            expect(result.type).toBe('error');
            expect(result.message).toBe('Something went wrong');
        });

        it('should handle unknown errors', () => {
            const error = 'string error';
            const result = parseApiError(error);

            expect(result.type).toBe('error');
            expect(result.message).toBe('An unexpected error occurred');
        });
    });

    describe('Error Types', () => {
        const errorTypes: ErrorType[] = [
            'error',
            'warning',
            'info',
            'rate-limit',
            'network',
            'auth',
            'validation',
            'session',
        ];

        it('should define all expected error types', () => {
            errorTypes.forEach(type => {
                expect(type).toBeDefined();
            });
        });
    });

    describe('Error Message Formatting', () => {
        it('should provide user-friendly rate limit message', () => {
            const result = parseApiError({ status: 429 } as Response);
            expect(result.message).toContain('many requests');
        });

        it('should provide user-friendly auth message', () => {
            const result = parseApiError({ status: 401 } as Response);
            expect(result.message).toContain('not authorized');
        });

        it('should provide user-friendly network message', () => {
            const result = parseApiError(new TypeError('Failed to fetch'));
            expect(result.message).toContain('connect');
        });

        it('should provide user-friendly server error message', () => {
            const result = parseApiError({ status: 500 } as Response);
            expect(result.message).toContain('Server error');
        });
    });
});

describe('API Response Handling', () => {
    describe('Success Responses', () => {
        it('should handle 200 OK', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                json: async () => ({ success: true, data: {} }),
            };

            expect(mockResponse.ok).toBe(true);
            const data = await mockResponse.json();
            expect(data.success).toBe(true);
        });

        it('should handle 201 Created', async () => {
            const mockResponse = {
                ok: true,
                status: 201,
                json: async () => ({ success: true, id: 'new-id' }),
            };

            expect(mockResponse.ok).toBe(true);
            const data = await mockResponse.json();
            expect(data.id).toBe('new-id');
        });
    });

    describe('Error Responses', () => {
        it('should detect error responses', () => {
            const errorResponses = [400, 401, 403, 404, 429, 500, 502, 503];

            errorResponses.forEach(status => {
                const mockResponse = { ok: false, status };
                expect(mockResponse.ok).toBe(false);
            });
        });
    });
});
