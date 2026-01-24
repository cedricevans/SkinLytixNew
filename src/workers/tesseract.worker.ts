import Tesseract from 'tesseract.js';

type ProgressPayload = { status?: string; progress?: number } & Record<string, unknown>;

// Worker listens for messages with { image: string }
self.addEventListener('message', async (ev: MessageEvent) => {
  const data = ev.data as { image: string } | null;
  const image = data?.image;

  if (!image) {
    (self as unknown as Worker).postMessage({ type: 'error', payload: 'No image provided' });
    return;
  }

  try {
    const result = await Tesseract.recognize(image, 'eng', {
      logger: (m: ProgressPayload) => {
        // forward progress messages
        (self as unknown as Worker).postMessage({ type: 'progress', payload: m });
      },
      // keep default options; the main thread can configure preprocessing
    } as any);

    (self as unknown as Worker).postMessage({ type: 'result', payload: result });
  } catch (error) {
    (self as unknown as Worker).postMessage({ type: 'error', payload: String(error) });
  }
});

export {};
