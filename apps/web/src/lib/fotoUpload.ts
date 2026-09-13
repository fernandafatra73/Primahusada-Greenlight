/** Batas 10 MB menjaga data URL (~1,33x ukuran file) tetap di bawah bodyLimit API 16 MB. */
export const FOTO_MAX_BYTES = 10 * 1024 * 1024;

export const FOTO_ALLOWED_TYPES: ReadonlyArray<string> = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export interface FotoFileInfo {
  readonly type: string;
  readonly size: number;
}

/** Mengembalikan pesan error untuk ditampilkan, atau null bila file boleh diunggah. */
export function validateFotoFile(file: FotoFileInfo): string | null {
  if (!FOTO_ALLOWED_TYPES.includes(file.type)) {
    return 'Format foto tidak didukung. Gunakan JPEG, PNG, GIF, atau WEBP.';
  }
  if (file.size <= 0) {
    return 'File foto kosong.';
  }
  if (file.size > FOTO_MAX_BYTES) {
    return 'Ukuran foto maksimal 10 MB.';
  }
  return null;
}

export function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (): void => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Gagal membaca file foto'));
      }
    };
    reader.onerror = (): void => reject(new Error('Gagal membaca file foto', { cause: reader.error }));
    reader.readAsDataURL(file);
  });
}
