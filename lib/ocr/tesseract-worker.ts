import { createWorker, type Worker } from "tesseract.js";

import { OCR_WORKER_MAX_USES } from "@/lib/ocr/config";

type WorkerSlot = {
  worker: Worker;
  languages: string;
  uses: number;
};

let slot: WorkerSlot | null = null;
let queue: Promise<unknown> = Promise.resolve();

function resetSlot(): void {
  slot = null;
}

async function destroyWorker(): Promise<void> {
  if (!slot) return;
  const w = slot.worker;
  resetSlot();
  await w.terminate().catch(() => {});
}

async function createTesseractWorker(languages: string): Promise<Worker> {
  const worker = await createWorker(languages, undefined, {
    logger: () => {},
  });
  return worker;
}

async function ensureWorker(languages: string): Promise<Worker> {
  if (slot && slot.languages === languages && slot.uses < OCR_WORKER_MAX_USES) {
    slot.uses += 1;
    return slot.worker;
  }

  await destroyWorker();

  const worker = await createTesseractWorker(languages);
  slot = { worker, languages, uses: 1 };
  return worker;
}

/** Kolejkuje wywołania — jeden worker, brak równoległego recognize na tym samym procesie. */
export async function withTesseractWorker<T>(
  languages: string,
  fn: (worker: Worker) => Promise<T>,
): Promise<T> {
  const run = async (): Promise<T> => {
    try {
      const worker = await ensureWorker(languages);
      return await fn(worker);
    } catch (e: unknown) {
      await destroyWorker();
      throw e;
    }
  };

  const chained = queue.then(run, run);
  queue = chained.then(
    () => undefined,
    () => undefined,
  );
  return chained;
}

/** Zwolnij workera (np. po teście lub shutdown). */
export async function releaseTesseractWorker(): Promise<void> {
  await destroyWorker();
  queue = Promise.resolve();
}

if (typeof process !== "undefined") {
  const onExit = () => {
    void destroyWorker();
  };
  process.once("beforeExit", onExit);
  process.once("SIGINT", onExit);
  process.once("SIGTERM", onExit);
}
