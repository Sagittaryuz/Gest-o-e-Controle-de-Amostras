import { readBarcodes } from 'zxing-wasm';

// Standard configurations for local database of format string names
const FORMAT_MAP: Record<string, string> = {
  'EAN-13': 'EAN13',
  'EAN_13': 'EAN13',
  'EAN13': 'EAN13',
  'EAN-8': 'EAN8',
  'EAN_8': 'EAN8',
  'EAN8': 'EAN8',
  'UPC-A': 'UPCA',
  'UPC_A': 'UPCA',
  'UPCA': 'UPCA',
  'UPC-E': 'UPCE',
  'UPC_E': 'UPCE',
  'UPCE': 'UPCE',
  'Code-128': 'Code128',
  'CODE_128': 'Code128',
  'Code128': 'Code128',
  'Code-39': 'Code39',
  'CODE_39': 'Code39',
  'Code39': 'Code39',
  'ITF': 'ITF',
  'QR-Code': 'QRCode',
  'QR_CODE': 'QRCode',
  'QRCode': 'QRCode',
  'Data-Matrix': 'DataMatrix',
  'DATA_MATRIX': 'DataMatrix',
  'DataMatrix': 'DataMatrix'
};

const DEFAULT_FORMATS = ['EAN13', 'EAN8', 'UPCA', 'UPCE', 'Code128', 'Code39', 'ITF', 'QRCode'];

export interface ScanResult {
  value: string;
  format: string;
  confidence?: number;
  timestamp: number;
  source: 'camera';
  orientation: number;
}

export class BarcodeScannerService {
  private static instance: BarcodeScannerService | null = null;
  
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private worker: Worker | null = null;
  private isRunning = false;
  private isPausedState = false;
  private formats: string[] = [...DEFAULT_FORMATS];
  
  // Frame processing loop refs
  private animationFrameId: number | null = null;
  private videoFrameCallbackId: number | null = null;
  private isDecoding = false;
  private frameCount = 0;
  
  // Canvas resource pooling to avoid garbage collection pauses (GC churn)
  private canvasElement: HTMLCanvasElement | OffscreenCanvas | null = null;
  private canvasCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;
  
  // Callback for detections
  private detectedCallback: ((result: ScanResult) => void) | null = null;
  
  // Validation / Double-Tap detection history to prevent false positives
  private lastDetectedText = '';
  private lastDetectedTime = 0;
  
  // Adaptive Performance Throttling counters
  private decodeTimeHistory: number[] = [];
  private lastFrameProcessedTime = 0;
  private isDebug = false;

  private constructor() {
    // Under zxing-wasm 3.x, auto-targets jsDelivr for CDN files directly.
  }

  public static getInstance(): BarcodeScannerService {
    if (!BarcodeScannerService.instance) {
      BarcodeScannerService.instance = new BarcodeScannerService();
    }
    return BarcodeScannerService.instance;
  }

  /**
   * Set barcode formats to be detected.
   */
  public setFormats(formats: string[]): void {
    this.formats = formats
      .map(f => FORMAT_MAP[f] || FORMAT_MAP[f.toUpperCase()] || f)
      .filter((v, i, self) => self.indexOf(v) === i);
    
    this.log(`Active barcode formats configured:`, this.formats);
  }

  /**
   * Listen to decoded scans.
   */
  public onDetected(callback: (result: ScanResult) => void): void {
    this.detectedCallback = callback;
  }

  /**
   * Initialize stream and start frame processing.
   */
  public async start(videoElement: HTMLVideoElement, options: { debug?: boolean; formats?: string[] } = {}): Promise<void> {
    if (this.isRunning) {
      this.log("Scanner is already running. Resetting stream source with new video target.");
      await this.stop();
    }

    this.videoElement = videoElement;
    this.isRunning = true;
    this.isPausedState = false;
    this.isDecoding = false;
    this.frameCount = 0;
    this.lastDetectedText = '';
    this.lastDetectedTime = 0;
    this.decodeTimeHistory = [];
    this.lastFrameProcessedTime = 0;
    this.isDebug = !!options.debug;

    if (options.formats) {
      this.setFormats(options.formats);
    }

    try {
      // 1. Request rear camera with optimal high resolutions (1280x720 ideal fallback to 1920x1080)
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 }
        },
        audio: false
      };

      this.log("Acquiring visual media stream with constraints:", constraints);
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Assign and play on video target
      this.videoElement.srcObject = this.stream;
      this.videoElement.setAttribute("playsinline", "true");
      this.videoElement.muted = true;
      await this.videoElement.play();

      // Apply autofocus and a light zoom factor (1.25x) if supported to increase focus speed
      await this.configureCameraTrack();

      // 2. Initialize background worker
      this.initWebWorker();

      // 3. Sprout standard frame capture loop
      this.scheduleNextFrame();
      this.log("Barcode scanner service started successfully!");
    } catch (err) {
      this.log("Failed to start barcode scanner:", err);
      this.isRunning = false;
      throw err;
    }
  }

  /**
   * Stop both media stream and frame loop processors completely.
   */
  public async stop(): Promise<void> {
    this.log("Stopping barcode reading loop and clean pooling resources...");
    this.isRunning = false;
    this.isPausedState = false;

    // Stop streams
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }

    // Cancel animation and frame capture handlers
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.videoFrameCallbackId !== null && this.videoElement && 'cancelVideoFrameCallback' in this.videoElement) {
      try {
        (this.videoElement as any).cancelVideoFrameCallback(this.videoFrameCallbackId);
      } catch (e) {}
      this.videoFrameCallbackId = null;
    }

    // Terminate Web Worker
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    // Clearpooled dimensions
    this.canvasElement = null;
    this.canvasCtx = null;
    this.isDecoding = false;
  }

  /**
   * Pause processing scans temporarily (maintains stream).
   */
  public pause(): void {
    this.isPausedState = true;
    this.log("Scanner loop paused.");
  }

  /**
   * Resume processing scans.
   */
  public resume(): void {
    this.isPausedState = false;
    this.isDecoding = false;
    this.log("Scanner loop resumed.");
  }

  /**
   * Turn flashlight Torch on or off on devices that support it.
   */
  public async setTorch(on: boolean): Promise<boolean> {
    if (!this.stream) return false;
    const track = this.stream.getVideoTracks()[0];
    if (!track) return false;

    try {
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      if ('torch' in capabilities && capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: on } as any]
        });
        this.log(`Torch toggle applied: ${on}`);
        return true;
      }
    } catch (e) {
      this.log("Failed to apply torch constraints:", e);
    }
    return false;
  }

  /**
   * Configures camera track for autofocus and mild automatic zoom factors.
   */
  private async configureCameraTrack(): Promise<void> {
    if (!this.stream) return;
    const track = this.stream.getVideoTracks()[0];
    if (!track) return;

    try {
      const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
      const advancedConstraints: any = {};

      // Auto-focus continuous selection
      if ('focusMode' in capabilities && Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes('continuous')) {
        advancedConstraints.focusMode = 'continuous';
      }

      // Safe small zoom to help cellular focal length (approx 1.25x)
      if ('zoom' in capabilities && typeof capabilities.zoom === 'object') {
        const minZ = capabilities.zoom.min || 1;
        const maxZ = capabilities.zoom.max || 1;
        if (maxZ > minZ) {
          // Set to a low initial zoom around 1.25x of minimum to prevent wide angle distortions on some systems
          const destZoom = Math.min(maxZ, minZ * 1.25);
          advancedConstraints.zoom = destZoom;
        }
      }

      if (Object.keys(advancedConstraints).length > 0) {
        await track.applyConstraints({ advanced: [advancedConstraints] });
        this.log("Applied continuous focus/zoom track constraints:", advancedConstraints);
      }
    } catch (e) {
      this.log("Silent constraints apply ignored:", e);
    }
  }

  /**
   * Initialize dynamic Web Worker for off-thread calculation.
   */
  private initWebWorker(): void {
    if (this.worker) {
      this.worker.terminate();
    }

    try {
      // Instantiates the worker using Vite module standard loader
      this.worker = new Worker(new URL('./barcode.worker.ts', import.meta.url), { type: 'module' });
      
      this.worker.onmessage = (e: MessageEvent) => {
        const { success, results, error } = e.data;
        const decodeDuration = Date.now() - this.lastFrameProcessedTime;
        
        // Push decoded speed time to adaptively adjust FPS later
        this.decodeTimeHistory.push(decodeDuration);
        if (this.decodeTimeHistory.length > 5) this.decodeTimeHistory.shift();

        this.isDecoding = false;

        if (success && results && results.length > 0) {
          this.handleWorkerResults(results);
        } else if (error) {
          this.log("Worker returned an error:", error);
        }

        // Keep loop executing
        if (this.isRunning && !this.isPausedState) {
          this.scheduleNextFrame();
        }
      };

      this.log("Web Worker for barcode compilation instantiated.");
    } catch (err) {
      this.log("Failed to spawn Web Worker. Direct main-thread parser will be chosen as fallback.", err);
      this.worker = null;
    }
  }

  /**
   * Set timer hooks for next processing frames
   */
  private scheduleNextFrame(): void {
    if (!this.isRunning || this.isPausedState || this.isDecoding) return;

    const video = this.videoElement;
    if (!video) return;

    const captureFrame = () => {
      this.processVideoFrame().catch(err => {
        this.log("Error processing video frame: ", err);
        this.isDecoding = false;
        this.scheduleNextFrame();
      });
    };

    // requestVideoFrameCallback carries precise browser camera frame synchronization when fully supported
    if ('requestVideoFrameCallback' in video) {
      this.videoFrameCallbackId = (video as any).requestVideoFrameCallback(captureFrame);
    } else {
      this.animationFrameId = requestAnimationFrame(captureFrame);
    }
  }

  /**
   * Handle canvas scaling, region of interest slicing, and submit decoding jobs.
   */
  private async processVideoFrame(): Promise<void> {
    if (!this.isRunning || this.isPausedState || this.isDecoding) return;
    
    const video = this.videoElement;
    if (!video || video.paused || video.ended || video.readyState < 2) {
      this.scheduleNextFrame();
      return;
    }

    // Throttling: Calculate target FPS on poor processing latency
    // If average decode takes > 120ms, drop cycle to 6-10 FPS (120-160ms cycle). Otherwise target 12-15 FPS (70-90ms cycle)
    const avgDecodeTime = this.decodeTimeHistory.length > 0 
      ? this.decodeTimeHistory.reduce((a, b) => a + b, 0) / this.decodeTimeHistory.length 
      : 50;
    
    // Minimum interval between frames
    const frameIntervalLimit = avgDecodeTime > 120 ? 140 : 75;
    const now = Date.now();
    const elapsedTime = now - this.lastFrameProcessedTime;

    if (elapsedTime < frameIntervalLimit) {
      // Re-trigger fast to respect target framing interval limits
      this.animationFrameId = requestAnimationFrame(() => this.scheduleNextFrame());
      return;
    }

    this.isDecoding = true;
    this.lastFrameProcessedTime = now;

    // Set operational sizes (Optimal range 640px to 1280px)
    const rawW = video.videoWidth || 1280;
    const rawH = video.videoHeight || 720;
    const clampTargetWidth = Math.max(640, Math.min(960, rawW));
    const clampTargetHeight = Math.round(clampTargetWidth * (rawH / rawW));

    // Crop Region of Interest first, matching 70% width and 45% height to focus on barcodes
    // Every 5th frame, parse full screen to catch displaced or wild angles
    const useROI = this.frameCount % 5 !== 0;
    this.frameCount++;

    let finalCanvasW = clampTargetWidth;
    let finalCanvasH = clampTargetHeight;
    let sx = 0, sy = 0, sWidth = rawW, sHeight = rawH;

    if (useROI) {
      const roiWPercent = 0.75;
      const roiHPercent = 0.50; // generous central stripe

      sWidth = Math.round(rawW * roiWPercent);
      sHeight = Math.round(rawH * roiHPercent);
      sx = Math.round((rawW - sWidth) / 2);
      sy = Math.round((rawH - sHeight) / 2);

      finalCanvasW = Math.round(clampTargetWidth * roiWPercent);
      finalCanvasH = Math.round(clampTargetHeight * roiHPercent);
    }

    // Initialize or reuse recycled canvas contexts
    if (!this.canvasElement) {
      if (typeof OffscreenCanvas !== 'undefined') {
        this.canvasElement = new OffscreenCanvas(finalCanvasW, finalCanvasH);
      } else {
        this.canvasElement = document.createElement('canvas');
        this.canvasElement.width = finalCanvasW;
        this.canvasElement.height = finalCanvasH;
      }
      this.canvasCtx = this.canvasElement.getContext('2d') as any;
    }

    const canvas = this.canvasElement;
    const ctx = this.canvasCtx;

    if (!canvas || !ctx) {
      this.isDecoding = false;
      this.scheduleNextFrame();
      return;
    }

    // Dynamic resize of recycled canvas element sizes
    if (canvas.width !== finalCanvasW || canvas.height !== finalCanvasH) {
      canvas.width = finalCanvasW;
      canvas.height = finalCanvasH;
    }

    // Draw frame crop slice
    ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, finalCanvasW, finalCanvasH);
    
    // Acquire clamped raw pixels
    const imageData = ctx.getImageData(0, 0, finalCanvasW, finalCanvasH);

    const readerOptions: any = {
      formats: this.formats,
      tryRotate: true,
      tryDownscale: true,
      tryHarder: true,
      maxNumberOfBarcodes: 1
    };

    // Send decoding work offload to Worker or process on direct main-thread backup channel
    if (this.worker) {
      // Transfer ArrayBuffer cleanly to worker without rendering copy times!
      const buffer = imageData.data.buffer;
      this.worker.postMessage({
        id: now,
        imageData,
        options: readerOptions
      }, [buffer]);
    } else {
      // Direct main thread fallback channel
      try {
        const startT = Date.now();
        const results = await readBarcodes(imageData, readerOptions);
        const elapsed = Date.now() - startT;
        
        this.decodeTimeHistory.push(elapsed);
        if (this.decodeTimeHistory.length > 5) this.decodeTimeHistory.shift();

        this.isDecoding = false;
        
        if (results && results.length > 0) {
          const mapped = results.map(r => ({
            text: r.text || '',
            format: r.format || '',
            orientation: r.orientation ?? 0,
            isValid: r.isValid ?? true
          }));
          this.handleWorkerResults(mapped);
        }

        if (this.isRunning && !this.isPausedState) {
          this.scheduleNextFrame();
        }
      } catch (err) {
        this.log("Fallback execution error:", err);
        this.isDecoding = false;
        if (this.isRunning && !this.isPausedState) {
          this.scheduleNextFrame();
        }
      }
    }
  }

  /**
   * Verify candidate array and invoke triggers on verified checksums.
   */
  private handleWorkerResults(results: Array<{ text: string; format: string; orientation: number; isValid: boolean }>): void {
    if (!results || results.length === 0) return;

    for (const res of results) {
      const { text, format, orientation } = res;
      if (!text) continue;

      // Normalize results removal of spaces/accents/characters
      const cleanText = text.replace(/[\s\r\n\t]/g, '').trim();
      if (!cleanText) continue;

      // 1. Validator checksums EAN/UPC digit checks
      const isEanOrUpc = ['EAN13', 'EAN8', 'UPCA', 'UPCE'].includes(format);
      let checksumPass = true;
      if (isEanOrUpc) {
        checksumPass = this.validateEanUpcChecksum(cleanText, format);
      }

      if (!checksumPass) {
        this.log(`Discarded code matching ${format}: ${cleanText} on failed checksum.`);
        continue;
      }

      // 2. Reduce false-positive triggers via double consecutive scanning confirmations in 700ms
      const now = Date.now();
      const doubleCheckTrigger = this.lastDetectedText === cleanText && (now - this.lastDetectedTime) <= 700;

      this.lastDetectedText = cleanText;
      this.lastDetectedTime = now;

      // 2D formats (QRCode/DataMatrix) are highly secure by default via reed-solomon ecc (accept instantly)
      const is2D = ['QRCode', 'DataMatrix'].includes(format);

      // Trigger detection on 2D OR on double scanning confirmation OR of EAN/UPC barcodes passing math checksums
      if (is2D || doubleCheckTrigger || (isEanOrUpc && checksumPass)) {
        if (this.detectedCallback) {
          // Fire event triggers immediately
          this.detectedCallback({
            value: cleanText,
            format: format,
            timestamp: now,
            source: 'camera',
            orientation: (orientation as any) || 0
          });
        }
        break; // stop evaluation on verified trigger
      }
    }
  }

  /**
   * Math EAN-13, EAN-8, UPC-A, UPC-E digit check algorithms.
   */
  private validateEanUpcChecksum(value: string, format: string): boolean {
    const digits = value.replace(/\D/g, '');
    
    if (format === 'UPCE' && digits.length === 8) {
      const expanded = this.expandUPCEtoUPCA(digits);
      if (!expanded) return false;
      return this.validateUPCAChecksum(expanded);
    }
    
    if (format === 'EAN13' && digits.length === 13) {
      return this.validateEAN13Checksum(digits);
    }
    
    if (format === 'EAN8' && digits.length === 8) {
      return this.validateEAN8Checksum(digits);
    }
    
    if (format === 'UPCA' && digits.length === 12) {
      return this.validateUPCAChecksum(digits);
    }
    
    return false;
  }

  private validateEAN13Checksum(digits: string): boolean {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(digits[i], 10);
      sum += (i % 2 === 0) ? digit * 1 : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(digits[12], 10);
  }

  private validateEAN8Checksum(digits: string): boolean {
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      const digit = parseInt(digits[i], 10);
      sum += (i % 2 === 0) ? digit * 3 : digit * 1;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(digits[7], 10);
  }

  private validateUPCAChecksum(digits: string): boolean {
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      const digit = parseInt(digits[i], 10);
      sum += (i % 2 === 0) ? digit * 3 : digit * 1;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(digits[11], 10);
  }

  private expandUPCEtoUPCA(upce: string): string | null {
    if (upce.length !== 8) return null;
    const s = upce[0];
    const x1 = upce[1];
    const x2 = upce[2];
    const x3 = upce[3];
    const x4 = upce[4];
    const x5 = upce[5];
    const x6 = upce[6];
    const c = upce[7];

    let upca = '';
    if (['0', '1', '2'].includes(x6)) {
      upca = s + x1 + x2 + x6 + '0000' + x3 + x4 + x5 + c;
    } else if (x6 === '3') {
      upca = s + x1 + x2 + x3 + '00000' + x4 + x5 + c;
    } else if (x6 === '4') {
      upca = s + x1 + x2 + x3 + x4 + '00000' + x5 + c;
    } else {
      upca = s + x1 + x2 + x3 + x4 + x5 + '0000' + x6 + c;
    }
    return upca;
  }

  private log(message: string, ...args: any[]): void {
    if (this.isDebug) {
      console.log(`[BarcodeScannerService] ${message}`, ...args);
    }
  }
}

export const barcodeScannerService = BarcodeScannerService.getInstance();
