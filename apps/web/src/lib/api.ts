export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: (T & { error?: string }) | undefined;
  if (text) {
    try {
      data = JSON.parse(text) as T & { error?: string };
    } catch {
      // Bisa terjadi kalau koneksi terputus di tengah respons (mis. server
      // restart saat request berjalan) — pesan aslinya ("Unexpected end of
      // JSON input") membingungkan, jadi kita ganti dengan yang lebih jelas.
      throw new ApiError('Respons server tidak valid. Coba muat ulang halaman.', res.status);
    }
  }
  if (!res.ok) {
    throw new ApiError(data?.error ?? `Request failed (${res.status})`, res.status);
  }
  if (data === undefined) {
    throw new ApiError('Respons server kosong. Coba muat ulang halaman.', res.status);
  }
  return data;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path);
  return parseJson<T>(res);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseJson<T>(res);
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseJson<T>(res);
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(path, { method: 'DELETE' });
  return parseJson<T>(res);
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseJson<T>(res);
}
