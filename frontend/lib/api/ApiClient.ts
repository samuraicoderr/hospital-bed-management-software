/**
 * API Client with Token Management
 * Handles all HTTP requests with automatic token refresh and error handling
 */

import { tokenManager, authUtils } from './auth/TokenManager';

// Types
export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: unknown;
}

export interface ApiRequestConfig<P = Record<string, string | number | boolean | undefined>>
  extends RequestInit {
  requiresAuth?: boolean;
  skipErrorHandler?: boolean;
  params?: P;
  timeout?: number;
  _isFormData?: boolean;
}

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
}

// Configuration
const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000/api/v1',
  TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
} as const;


export interface ErrorWithCode {
  message: string;
  status: number;
  code: string;
  details?: unknown;
}

// Type guard
export function isErrorWithCodeType(obj: unknown): obj is ErrorWithCode {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "message" in obj &&
    typeof (obj as any).message === "string" &&
    "status" in obj &&
    typeof (obj as any).status === "number" &&
    "code" in obj &&
    typeof (obj as any).code === "string"
  );
}



class ApiClient {
  private baseURL: string;
  private onUnauthorized?: () => void;
  private requestInterceptors: Array<(config: ApiRequestConfig<any>) => ApiRequestConfig<any> | Promise<ApiRequestConfig<any>>> = [];
  private responseInterceptors: Array<(response: Response) => Response | Promise<Response>> = [];

  constructor(baseURL: string = API_CONFIG.BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Set callback for unauthorized responses (401)
   */
  onUnauthorizedCallback(callback: () => void): void {
    this.onUnauthorized = callback;
    tokenManager.onTokenExpired(callback);
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(
    interceptor: (config: ApiRequestConfig) => ApiRequestConfig | Promise<ApiRequestConfig>
  ): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(
    interceptor: (response: Response) => Response | Promise<Response>
  ): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * GET request
   */
  async get<T = unknown, P = Record<string, any>>(
    endpoint: string,
    config?: ApiRequestConfig<P>
  ): Promise<ApiResponse<T>> {
    return this.request<T, P>(endpoint, { ...(config as any), method: 'GET' });
  }

  /**
   * POST request
   */

  async post<T = unknown, P = Record<string, any>>(
    endpoint: string,
    data?: unknown,
    config?: ApiRequestConfig<P>
  ): Promise<ApiResponse<T>> {
    const { body, isFormData } = this.serializeRequestBody(data);
    return this.request<T, P>(endpoint, {
      ...(config as any),
      method: 'POST',
      body,
      _isFormData: isFormData,
    });
  }

  /**
   * PUT request
   */
  async put<T = unknown, P = Record<string, any>>(
    endpoint: string,
    data?: unknown,
    config?: ApiRequestConfig<P>
  ): Promise<ApiResponse<T>> {
    const { body, isFormData } = this.serializeRequestBody(data);
    return this.request<T, P>(endpoint, {
      ...(config as any),
      method: 'PUT',
      body,
      _isFormData: isFormData,
    });
  }

  /**
   * PATCH request
   */
  async patch<T = unknown, P = Record<string, any>>(
    endpoint: string,
    data?: unknown,
    config?: ApiRequestConfig<P>
  ): Promise<ApiResponse<T>> {
    const { body, isFormData } = this.serializeRequestBody(data);
    return this.request<T, P>(endpoint, {
      ...(config as any),
      method: 'PATCH',
      body,
      _isFormData: isFormData,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = unknown, P = Record<string, any>>(
    endpoint: string,
    config?: ApiRequestConfig<P>
  ): Promise<ApiResponse<T>> {
    return this.request<T, P>(endpoint, {
      ...(config as any),
      method: 'DELETE'
    });
  }

  /**
   * Main request method
   */
  private async request<T, P = Record<string, any>>(
    endpoint: string,
    config: ApiRequestConfig<P> = {}
  ): Promise<ApiResponse<T>> {
    const {
      requiresAuth = true,
      skipErrorHandler = false,
      timeout = API_CONFIG.TIMEOUT,
      params = {},
      _isFormData = false,
      ...fetchConfig
    } = config as ApiRequestConfig<any>;

    // Track retry attempts for this specific request
    const retryCount = (config as any)._retryCount || 0;
    const maxRetries = (config as any).maxRetries ?? API_CONFIG.MAX_RETRIES;

    let timeoutId: NodeJS.Timeout | number | undefined;
    let controller: AbortController | undefined;

    try {
      // Build URL
      const url = this.buildURLWithParams(endpoint, params);

      // Prepare headers
      const headers = await this.prepareHeaders(config.headers, requiresAuth, _isFormData);

      // Apply request interceptors
      let finalConfig: ApiRequestConfig = {
        ...fetchConfig,
        headers,
      };

      for (const interceptor of this.requestInterceptors) {
        finalConfig = await interceptor(finalConfig);
      }

      // Create abort controller for timeout
      controller = new AbortController();
      timeoutId = setTimeout(() => controller?.abort(), timeout);

      try {
        // Make request
        let response = await fetch(url, {
          ...finalConfig,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        timeoutId = undefined;

        // Apply response interceptors
        for (const interceptor of this.responseInterceptors) {
          response = await interceptor(response);
        }

        // Handle token expiration with single retry
        if (!response.ok && response.status === 401) {
          // Clone response to read body without consuming it
          const clonedResponse = response.clone();

          try {
            const errorBody = await clonedResponse.json();

            if (errorBody?.code === "TOKEN_EXPIRED" || errorBody?.error === "token_expired") {
              // Prevent infinite retry loops
              if ((config as any)._tokenRefreshAttempted) {
                console.error('[ApiClient] Token refresh already attempted, failing request');
                this.handleUnauthorized();
                throw this.createError(
                  'Authentication session expired. Please login again.',
                  401,
                  'TOKEN_EXPIRED'
                );
              }

              console.log('[ApiClient] Token expired, attempting refresh...');

              try {
                await tokenManager.refreshAccessToken();

                // Retry request with new token - mark as refresh attempted
                return this.request<T, P>(endpoint, {
                  ...config,
                  _tokenRefreshAttempted: true,
                  _retryCount: 0, // Reset retry count for token refresh
                } as any);
              } catch (refreshError) {
                console.error('[ApiClient] Token refresh failed:', refreshError);
                this.handleUnauthorized();
                throw this.createError(
                  'Authentication session expired. Please login again.',
                  401,
                  'TOKEN_EXPIRED'
                );
              }
            }
          } catch (parseError) {
            // If we can't parse the error body, continue with normal error handling
            console.warn('[ApiClient] Could not parse 401 error body:', parseError);
          }
        }

        // Handle retryable errors (network issues, 5xx, rate limits)
        if (!response.ok && this.isRetryableError(response.status)) {
          if (retryCount < maxRetries) {
            const delay = this.calculateRetryDelay(retryCount);
            console.warn(
              `[ApiClient] Request failed with status ${response.status}, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`
            );

            await this.sleep(delay);

            return this.request<T, P>(endpoint, {
              ...config,
              _retryCount: retryCount + 1,
            } as any);
          } else {
            console.error(`[ApiClient] Max retries (${maxRetries}) reached for ${endpoint}`);
          }
        }

        // Handle non-retryable error status codes
        if (!response.ok) {
          throw await this.handleErrorResponse(response, skipErrorHandler);
        }

        // Parse response
        const data = await this.parseResponse<T>(response);

        return {
          data,
          status: response.status,
          headers: response.headers,
        };
      } finally {
        // Ensure timeout is always cleared
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
        }
      }
    } catch (error) {
      // Clean up timeout on error
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }

      // Handle timeout errors
      if (error instanceof Error && error.name === 'AbortError') {
        // Retry on timeout if retries available
        if (retryCount < maxRetries) {
          const delay = this.calculateRetryDelay(retryCount);
          console.warn(
            `[ApiClient] Request timeout, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`
          );

          await this.sleep(delay);

          return this.request<T, P>(endpoint, {
            ...config,
            _retryCount: retryCount + 1,
          } as any);
        }

        throw this.createError(
          'Request timeout - server did not respond in time',
          408,
          'REQUEST_TIMEOUT'
        );
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        // Retry on network errors if retries available
        if (retryCount < maxRetries) {
          const delay = this.calculateRetryDelay(retryCount);
          console.warn(
            `[ApiClient] Network error, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`
          );

          await this.sleep(delay);

          return this.request<T, P>(endpoint, {
            ...config,
            _retryCount: retryCount + 1,
          } as any);
        }

        throw this.createError(
          'Network error - please check your connection',
          0,
          'NETWORK_ERROR',
          error
        );
      }

      throw this.handleRequestError(error, skipErrorHandler);
    }
  }

  /**
   * Determine if an HTTP status code is retryable
   */
  private isRetryableError(status: number): boolean {
    return (
      status === 408 || // Request Timeout
      status === 429 || // Too Many Requests
      status === 500 || // Internal Server Error
      status === 502 || // Bad Gateway
      status === 503 || // Service Unavailable
      status === 504    // Gateway Timeout
    );
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateRetryDelay(retryCount: number): number {
    const baseDelay = API_CONFIG.RETRY_DELAY;
    const exponentialDelay = baseDelay * Math.pow(2, retryCount);
    const maxDelay = 10000; // Cap at 10 seconds
    const delay = Math.min(exponentialDelay, maxDelay);

    // Add jitter (±25%) to prevent thundering herd
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    return Math.round(delay + jitter);
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private serializeParams(params: Record<string, any> | undefined): string {
    if (!params) return "";

    const parts: string[] = [];

    for (const key of Object.keys(params)) {
      const val = (params as any)[key];

      if (val === undefined || val === null) continue;

      // arrays -> repeat key for each item
      if (Array.isArray(val)) {
        for (const v of val) {
          parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
        }
        continue;
      }

      // booleans/numbers/dates -> string
      if (val instanceof Date) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(val.toISOString())}`);
      } else {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`);
      }
    }

    return parts.length ? `?${parts.join("&")}` : "";
  }


  /**
   * Build full URL
   */
  private buildURL(endpoint: string): string {
    if (/^https?:\/\//i.test(endpoint)) {
      return endpoint;
    }
    if (endpoint.startsWith('/')) {
      const base = new URL(this.baseURL);
      return new URL(endpoint, `${base.protocol}//${base.host}`).toString();
    }
    // Remove leading slash from endpoint if present
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

    // Remove trailing slash from baseURL if present
    const cleanBaseURL = this.baseURL.endsWith('/')
      ? this.baseURL.slice(0, -1)
      : this.baseURL;

    return `${cleanBaseURL}/${cleanEndpoint}`;
  }

  private buildURLWithParams(endpoint: string, params?: Record<string, any>): string {
    const base = this.buildURL(endpoint);
    const qs = this.serializeParams(params);
    return qs ? `${base}${qs}` : base;
  }

  setBaseURL(url: string): void {
    this.baseURL = url;
  }


  /**
   * Prepare request headers
   */
  private async prepareHeaders(
    customHeaders?: HeadersInit,
    requiresAuth: boolean = true,
    isFormData: boolean = false,
  ): Promise<Headers> {
    const headers = new Headers(customHeaders);

    if (isFormData) {
      // Let browser set multipart boundary automatically.
      headers.delete('Content-Type');
    } else if (!headers.has('Content-Type')) {
      // Set default content type if not already set.
      headers.set('Content-Type', 'application/json');
    }

    // Add authorization header if required
    if (requiresAuth) {
      const authHeader = await authUtils.getAuthHeader();
      if ('Authorization' in authHeader) {
        headers.set('Authorization', authHeader.Authorization);
      }
    }

    return headers;
  }

  private serializeRequestBody(data?: unknown): { body?: BodyInit; isFormData: boolean } {
    if (data === undefined || data === null) {
      return { body: undefined, isFormData: false };
    }
    if (typeof FormData !== 'undefined' && data instanceof FormData) {
      return { body: data, isFormData: true };
    }
    return { body: JSON.stringify(data), isFormData: false };
  }

  /**
   * Parse response data
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');

    // Handle empty responses
    if (response.status === 204 || !contentType) {
      return null as T;
    }

    // Parse JSON
    if (contentType?.includes('application/json')) {
      return response.json();
    }

    // Parse text
    if (contentType?.includes('text/')) {
      return response.text() as T;
    }

    // Parse blob for binary data
    return response.blob() as T;
  }

  /**
   * Handle error response
   */
  private async handleErrorResponse(
    response: Response,
    skipHandler: boolean
  ): Promise<ApiError> {
    let errorMessage = `Request failed with status ${response.status}`;
    let errorDetails: unknown;

    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        errorDetails = await response.json();
        errorMessage = (errorDetails as { message?: string; detail?: string, error?: string }).message
          || (errorDetails as { message?: string; detail?: string, error?: string }).detail
          || (errorDetails as { message?: string; detail?: string, error?: string }).error
          || errorMessage;
      } else {
        errorMessage = await response.text() || errorMessage;
      }
    } catch (parseError) {
      console.error('[ApiClient] Failed to parse error response:', parseError);
    }

    const error = this.createError(
      errorMessage,
      response.status,
      this.getErrorCode(response.status),
      errorDetails
    );

    if (!skipHandler) {
      this.logError(error);
    }

    return error;
  }

  /**
   * Handle request error
   */
  private handleRequestError(error: unknown, skipHandler: boolean): ApiError {
    if (this.isApiError(error)) {
      return error;
    }

    const apiError = this.createError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      0,
      'NETWORK_ERROR',
      error
    );

    if (!skipHandler) {
      this.logError(apiError);
    }

    return apiError;
  }

  /**
   * Create standardized API error
   */
  private createError(
    message: string,
    status: number,
    code?: string,
    details?: unknown
  ): ApiError {
    return {
      message,
      status,
      code,
      details,
    };
  }

  /**
   * Check if error is ApiError
   */
  private isApiError(error: unknown): error is ApiError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      'status' in error
    );
  }

  /**
   * Get error code from status
   */
  private getErrorCode(status: number): string {
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      429: 'RATE_LIMIT_EXCEEDED',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };
    return codes[status] || 'UNKNOWN_ERROR';
  }

  /**
   * Log error
   */
  private logError(error: ApiError): void {
    console.error('[ApiClient] Request failed:', {
      message: error.message,
      status: error.status,
      code: error.code,
      details: error.details,
    });
  }

  /**
   * Handle unauthorized response
   */
  private handleUnauthorized(): void {
    if (this.onUnauthorized) {
      this.onUnauthorized();
    }
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient();

// Export utility function to configure API client
export const configureApiClient = (config: {
  baseURL?: string;
  onUnauthorized?: () => void;
}): void => {
  if (config.baseURL) {
    apiClient.setBaseURL(config.baseURL);
  }

  if (config.onUnauthorized) {
    apiClient.onUnauthorizedCallback(config.onUnauthorized);
  }
};


// Export convenience methods
export const api = {
  get: <T, P = Record<string, any>>(endpoint: string, config?: ApiRequestConfig<P>) =>
    apiClient.get<T, P>(endpoint, config),

  post: <T, P = Record<string, any>>(endpoint: string, data?: unknown, config?: ApiRequestConfig<P>) =>
    apiClient.post<T, P>(endpoint, data, config),

  put: <T, P = Record<string, any>>(endpoint: string, data?: unknown, config?: ApiRequestConfig<P>) =>
    apiClient.put<T, P>(endpoint, data, config),

  patch: <T, P = Record<string, any>>(endpoint: string, data?: unknown, config?: ApiRequestConfig<P>) =>
    apiClient.patch<T, P>(endpoint, data, config),

  delete: <T, P = Record<string, any>>(endpoint: string, config?: ApiRequestConfig<P>) =>
    apiClient.delete<T, P>(endpoint, config),
};
