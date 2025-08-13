import axios, { AxiosInstance } from 'axios';

import { GRAPH_API_URL, META_TOKEN } from '../config/metaConfig';

import { setupRetryInterceptor } from './retryInterceptor';

export const httpClient: AxiosInstance = axios.create({
  baseURL: GRAPH_API_URL,
  headers: {
    Authorization: `Bearer ${META_TOKEN}`,
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// Apply retry interceptor
setupRetryInterceptor(httpClient);
