export class TimeoutError extends Error {
  constructor(message = "انتهت مهلة الاتصال بالخادم") {
    super(message);
    this.name = "TimeoutError";
  }
}

/** Runs a promise with a hard timeout so the UI never hangs on a stalled request. */
export async function withTimeout<T>(promise: PromiseLike<T>, ms = 12_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new TimeoutError()), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function arabicNetworkMessage(error: unknown): string {
  if (error instanceof TimeoutError) {
    return "انتهت مهلة الاتصال بالخادم. تحقق من اتصالك بالإنترنت ثم أعد المحاولة.";
  }
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/fetch|network|Failed to fetch|NetworkError/i.test(message)) {
    return "تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت ثم أعد المحاولة.";
  }
  return message || "حدث خطأ غير متوقع، حاول مرة أخرى.";
}
