import { AxiosInstance, AxiosError } from 'axios';

export function setupRetryInterceptor(
  client: AxiosInstance,
  options?: { retries?: number; retryDelay?: number }
): void {
  const retries = options?.retries ?? 3;
  const retryDelay = options?.retryDelay ?? 1000;

  client.interceptors.response.use(
    response => response,
    (error: AxiosError) => {
      const config = error.config as any;
      if (!config || config.__retryCount >= retries) {
        return Promise.reject(error);
      }
      config.__retryCount = (config.__retryCount || 0) + 1;
      return new Promise(resolve =>
        setTimeout(() => resolve(client(config)), retryDelay)
      );
    }
  );
}
