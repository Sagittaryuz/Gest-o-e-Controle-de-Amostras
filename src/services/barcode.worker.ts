import { readBarcodes } from 'zxing-wasm';

self.onmessage = async (e: MessageEvent) => {
  const { id, imageData, options } = e.data;
  try {
    const results = await readBarcodes(imageData, options);
    
    // Extract only standard relevant properties to send back
    const formattedResults = results.map(r => ({
      text: r.text || '',
      format: r.format || '',
      orientation: r.orientation ?? 0,
      isValid: r.isValid ?? true
    }));
    
    self.postMessage({ id, success: true, results: formattedResults });
  } catch (err: any) {
    self.postMessage({ id, success: false, error: err?.message || String(err) });
  }
};
