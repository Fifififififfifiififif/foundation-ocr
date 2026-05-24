export class OcrTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OcrTimeoutError";
  }
}

export function withOcrTimeout<T>(promise: Promise<T>, timeoutMs: number, label = "OCR"): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new OcrTimeoutError(
          `${label} przekroczyło limit czasu (${Math.round(timeoutMs / 1000)} s). Spróbuj mniejszego pliku lub wyższej jakości skanu.`,
        ),
      );
    }, timeoutMs);

    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}
