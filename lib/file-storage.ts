import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export type StoredFileMeta = {
  storedName: string;
  displayName: string;
  mimeType: string;
};

export type FileStorageBackend = "local" | "supabase";

export function fileStorageBackend(): FileStorageBackend {
  const v = process.env.FILE_STORAGE?.trim().toLowerCase();
  if (v === "supabase") return "supabase";
  return "local";
}

function uploadsDir(): string {
  return path.join(process.cwd(), "uploads");
}

/** Zapis pliku — domyślnie dysk `uploads/`. Supabase: ustaw FILE_STORAGE=supabase + zmienne w .env (wymaga konfiguracji bucket). */
export async function storeUploadedFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
): Promise<StoredFileMeta> {
  if (fileStorageBackend() === "supabase") {
    return storeUploadedFileSupabase(buffer, originalName, mimeType);
  }
  return storeUploadedFileLocal(buffer, originalName, mimeType);
}

export async function readStoredFile(storedName: string): Promise<Buffer> {
  if (fileStorageBackend() === "supabase") {
    return readStoredFileSupabase(storedName);
  }
  return readStoredFileLocal(storedName);
}

export function storedFileAbsolutePath(storedName: string): string {
  return path.join(uploadsDir(), storedName);
}

async function storeUploadedFileLocal(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
): Promise<StoredFileMeta> {
  const ext =
    path.extname(originalName).slice(1).toLowerCase() ||
    (mimeType === "image/png" ? "png" : mimeType === "image/jpeg" ? "jpg" : "pdf");

  const storedName = `${randomUUID()}.${ext}`;
  const dir = uploadsDir();
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, storedName), buffer);

  return { storedName, displayName: originalName, mimeType };
}

async function readStoredFileLocal(storedName: string): Promise<Buffer> {
  const full = storedFileAbsolutePath(storedName);
  if (full.includes("..")) throw new Error("Nieprawidłowa ścieżka pliku.");
  return fs.readFile(full);
}

async function storeUploadedFileSupabase(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
): Promise<StoredFileMeta> {
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "documents";

  if (!url || !key) {
    console.warn("[file-storage] Brak SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — fallback na dysk lokalny.");
    return storeUploadedFileLocal(buffer, originalName, mimeType);
  }

  const local = await storeUploadedFileLocal(buffer, originalName, mimeType);
  const objectPath = `org/${local.storedName}`;
  const uploadUrl = `${url.replace(/\/$/, "")}/storage/v1/object/${bucket}/${objectPath}`;

  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": mimeType,
      "x-upsert": "true",
    },
    body: new Uint8Array(buffer),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.warn(`[file-storage] Supabase upload failed (${res.status}): ${detail.slice(0, 200)}`);
    return local;
  }

  return { ...local, storedName: objectPath };
}

async function readStoredFileSupabase(storedName: string): Promise<Buffer> {
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "documents";

  if (!url || !key || !storedName.startsWith("org/")) {
    return readStoredFileLocal(storedName);
  }

  const downloadUrl = `${url.replace(/\/$/, "")}/storage/v1/object/${bucket}/${storedName}`;
  const res = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    const base = path.basename(storedName);
    return readStoredFileLocal(base);
  }
  return Buffer.from(await res.arrayBuffer());
}
