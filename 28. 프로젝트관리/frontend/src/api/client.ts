import { useAuthStore } from '@/stores/authStore';

const BASE_URL = '/api';

interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string>;
  body?: string;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, body, ...fetchOptions } = options;
  const token = useAuthStore.getState().token;

  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const headers: Record<string, string> = {};
  if (body) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers: { ...headers, ...(fetchOptions.headers as any) },
    body,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(response.status, error);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public data: Record<string, unknown>
  ) {
    super((data.message as string) || `API Error: ${status}`);
  }
}
