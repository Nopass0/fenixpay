import { z } from "zod";

export interface HttpClientOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  backoffMultiplier?: number;
  headers?: Record<string, string>;
}

export interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body?: any
  ) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = "HttpError";
  }
}

export class HttpClient {
  private defaultOptions: HttpClientOptions;

  constructor(options: HttpClientOptions = {}) {
    this.defaultOptions = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
      headers: {
        "Content-Type": "application/json",
      },
      ...options,
    };
  }

  /**
   * Execute HTTP request with retries and exponential backoff
   */
  async request<T = any>(
    url: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      timeout = this.defaultOptions.timeout,
      retries = this.defaultOptions.retries,
      retryDelay = this.defaultOptions.retryDelay,
      ...fetchOptions
    } = options;

    const headers = {
      ...this.defaultOptions.headers,
      ...fetchOptions.headers,
    };

    let lastError: Error | undefined;
    let delay = retryDelay!;

    for (let attempt = 0; attempt <= retries!; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...fetchOptions,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const body = await this.parseResponseBody(response);
          throw new HttpError(response.status, response.statusText, body);
        }

        return await this.parseResponseBody(response);
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx)
        if (error instanceof HttpError && error.status >= 400 && error.status < 500) {
          throw error;
        }

        // Don't retry if this was the last attempt
        if (attempt < retries!) {
          await this.sleep(delay);
          delay *= this.defaultOptions.backoffMultiplier!;
        }
      }
    }

    throw lastError || new Error("Request failed");
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: "GET" });
  }

  /**
   * POST request
   */
  async post<T = any>(
    url: string,
    body?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T = any>(
    url: string,
    body?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    url: string,
    body?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: "DELETE" });
  }

  /**
   * Parse response body based on content type
   */
  private async parseResponseBody(response: Response): Promise<any> {
    const contentType = response.headers.get("content-type");
    
    if (contentType?.includes("application/json")) {
      return response.json();
    } else if (contentType?.includes("text/")) {
      return response.text();
    } else {
      return response.blob();
    }
  }

  /**
   * Sleep for given milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create typed HTTP client with Zod schema validation
 */
export function createTypedClient<T extends Record<string, z.ZodSchema>>(
  baseUrl: string,
  schemas: T,
  options?: HttpClientOptions
) {
  const client = new HttpClient(options);

  return new Proxy({} as any, {
    get(_, endpoint: string) {
      return async (path: string = "", requestOptions?: RequestOptions & { body?: any }) => {
        const schema = schemas[endpoint];
        if (!schema) {
          throw new Error(`No schema defined for endpoint: ${endpoint}`);
        }

        const url = `${baseUrl}${path}`;
        const response = await client.request(url, requestOptions);
        
        return schema.parse(response);
      };
    },
  }) as {
    [K in keyof T]: T[K] extends z.ZodSchema<infer R>
      ? (path?: string, options?: RequestOptions & { body?: any }) => Promise<R>
      : never;
  };
}

// Default client instance
export const httpClient = new HttpClient();