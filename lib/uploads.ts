import path from "path";

import { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES } from "@/lib/constants";
import {
  readStoredFile,
  storeUploadedFile,
  storedFileAbsolutePath,
  fileStorageBackend,
} from "@/lib/file-storage";

export { fileStorageBackend, readStoredFile, storedFileAbsolutePath };

/** Sprawdzenie sygnatury pliku (ochrona przed uszkodzonymi / fałszywymi typami). */
export function validateFileSignature(buffer: Buffer, mimeType: string): { ok: true } | { ok: false; error: string } {
  if (!buffer?.length) {
    return { ok: false, error: "Plik jest pusty lub uszkodzony." };
  }
  if (mimeType === "application/pdf") {
    const head = buffer.subarray(0, 5).toString("ascii");
    if (head !== "%PDF-") {
      return { ok: false, error: "Nieprawidłowy plik PDF (brak nagłówka %PDF-)." };
    }
    return { ok: true };
  }
  if (mimeType === "image/jpeg") {
    if (buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
      return { ok: false, error: "Nieprawidłowy plik JPEG." };
    }
    return { ok: true };
  }
  if (mimeType === "image/png") {
    const sig = buffer.subarray(0, 8);
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (!sig.equals(png)) {
      return { ok: false, error: "Nieprawidłowy plik PNG." };
    }
    return { ok: true };
  }
  return { ok: true };
}

/** Browsers (especially on Windows) often send an empty type or application/octet-stream. */
export function effectiveUploadMimeType(file: File): string {
  const raw = (file.type ?? "").trim().toLowerCase();
  if (ALLOWED_MIME_TYPES.has(raw)) return raw;
  if (raw && raw !== "application/octet-stream") return raw;

  const ext = path.extname(file.name).slice(1).toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  return raw;
}

export type ValidateUploadOptions = {
  maxBytes?: number;
};

export function validateUpload(
  file: File,
  options?: ValidateUploadOptions,
): { ok: true } | { ok: false; error: string } {
  const maxBytes = options?.maxBytes ?? MAX_UPLOAD_BYTES;
  const mime = effectiveUploadMimeType(file);
  if (!ALLOWED_MIME_TYPES.has(mime)) {
    return { ok: false, error: "Dozwolone są tylko pliki PDF, JPG i PNG." };
  }
  const ext = path.extname(file.name).slice(1).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { ok: false, error: "Nieprawidłowe rozszerzenie pliku." };
  }
  if (file.size > maxBytes) {
    const mb = Math.max(1, Math.round(maxBytes / (1024 * 1024)));
    return { ok: false, error: `Maksymalny rozmiar pliku to ${mb} MB.` };
  }
  return { ok: true };
}

/** @deprecated Użyj `storeUploadedFile` z `@/lib/file-storage`. */
export async function saveUploadedFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
): Promise<{ storedName: string; displayName: string; mimeType: string }> {
  return storeUploadedFile(buffer, originalName, mimeType);
}

export function uploadsPath(storedName: string): string {
  return storedFileAbsolutePath(storedName);
}
