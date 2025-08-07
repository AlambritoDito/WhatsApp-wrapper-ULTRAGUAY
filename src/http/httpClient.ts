import axios, { AxiosInstance } from 'axios';
import { META_TOKEN } from '../config/metaConfig';

export const httpClient: AxiosInstance = axios.create({
  baseURL: GRAPH_API_URL,
  headers: {
    Authorization: `Bearer ${META_TOKEN}`,
    'Content-Type': 'application/json'
  },
  timeout: 10000
});