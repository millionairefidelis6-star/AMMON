export interface ProcessedPassportPhoto {
  blob: Blob;
  dataUrl: string;
  originalWidth: number;
  originalHeight: number;
  width: number;
  height: number;
  sizeKb: number;
}

export interface ProcessedKycDocument {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  sizeKb: number;
}

const PASSPORT_TARGET_WIDTH = 500;
const PASSPORT_TARGET_HEIGHT = 600; // 5:6 ID Card Passport Aspect Ratio

function loadImageElementFromSource(
  source: File | Blob | string
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let objectUrl: string | null = null;

    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error('Unsupported or corrupted image file. Please select a valid JPG, PNG, or WebP photo.'));
    };

    if (typeof source === 'string') {
      img.src = source;
    } else {
      objectUrl = URL.createObjectURL(source);
      img.src = objectUrl;
    }
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to encode image canvas to JPEG.'));
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * Draw an image or canvas onto a target canvas rectangle using center-cover cropping.
 * alignY defaults to 0.25 (upper-biased) so portrait faces remain framed properly
 * inside the ID card passport box regardless of whether the source is landscape, square, or tall.
 */
export function drawImageCoverToCanvas(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  destX: number,
  destY: number,
  destW: number,
  destH: number,
  alignX = 0.5,
  alignY = 0.25
): void {
  if (!srcW || !srcH) return;

  const targetRatio = destW / destH;
  const sourceRatio = srcW / srcH;

  let sx = 0;
  let sy = 0;
  let sWidth = srcW;
  let sHeight = srcH;

  if (sourceRatio > targetRatio) {
    // Source is wider than target frame -> crop left & right cleanly
    sWidth = srcH * targetRatio;
    sx = Math.max(0, (srcW - sWidth) * alignX);
  } else if (sourceRatio < targetRatio) {
    // Source is taller than target frame -> crop top & bottom with upper portrait bias
    sHeight = srcW / targetRatio;
    sy = Math.max(0, (srcH - sHeight) * alignY);
  }

  ctx.drawImage(source, sx, sy, sWidth, sHeight, destX, destY, destW, destH);
}

/**
 * Auto-size, normalize background, and cover-fit ANY uploaded image or camera snapshot
 * into an exact 500x600 (5:6) ID Card Passport format.
 */
export async function processPassportPhoto(
  source: File | Blob | HTMLCanvasElement | HTMLVideoElement
): Promise<ProcessedPassportPhoto> {
  const canvas = document.createElement('canvas');
  canvas.width = PASSPORT_TARGET_WIDTH;
  canvas.height = PASSPORT_TARGET_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to initialize image processor.');

  // Fill neutral studio off-white background (handles transparent PNGs cleanly)
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, PASSPORT_TARGET_WIDTH, PASSPORT_TARGET_HEIGHT);

  let origW = 0;
  let origH = 0;

  if (source instanceof HTMLCanvasElement) {
    origW = source.width;
    origH = source.height;
    drawImageCoverToCanvas(
      ctx,
      source,
      origW,
      origH,
      0,
      0,
      PASSPORT_TARGET_WIDTH,
      PASSPORT_TARGET_HEIGHT,
      0.5,
      0.28
    );
  } else if (source instanceof HTMLVideoElement) {
    origW = source.videoWidth;
    origH = source.videoHeight;
    drawImageCoverToCanvas(
      ctx,
      source,
      origW,
      origH,
      0,
      0,
      PASSPORT_TARGET_WIDTH,
      PASSPORT_TARGET_HEIGHT,
      0.5,
      0.28
    );
  } else {
    const img = await loadImageElementFromSource(source);
    origW = img.naturalWidth || img.width;
    origH = img.naturalHeight || img.height;
    drawImageCoverToCanvas(
      ctx,
      img,
      origW,
      origH,
      0,
      0,
      PASSPORT_TARGET_WIDTH,
      PASSPORT_TARGET_HEIGHT,
      0.5,
      0.25
    );
  }

  const blob = await canvasToJpegBlob(canvas, 0.9);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

  return {
    blob,
    dataUrl,
    originalWidth: origW,
    originalHeight: origH,
    width: PASSPORT_TARGET_WIDTH,
    height: PASSPORT_TARGET_HEIGHT,
    sizeKb: Math.max(1, Math.round(blob.size / 1024)),
  };
}

/**
 * Auto-scale a captured government-issued ID or business license photo without cropping edges,
 * ensuring full document legibility at a clean web/storage-friendly resolution (max 1400px).
 */
export async function processKycDocumentImage(
  source: File | Blob | HTMLCanvasElement | HTMLVideoElement
): Promise<ProcessedKycDocument> {
  let srcW = 0;
  let srcH = 0;
  let drawable: CanvasImageSource;

  if (source instanceof HTMLCanvasElement) {
    srcW = source.width;
    srcH = source.height;
    drawable = source;
  } else if (source instanceof HTMLVideoElement) {
    srcW = source.videoWidth;
    srcH = source.videoHeight;
    drawable = source;
  } else {
    const img = await loadImageElementFromSource(source);
    srcW = img.naturalWidth || img.width;
    srcH = img.naturalHeight || img.height;
    drawable = img;
  }

  const MAX_DIM = 1400;
  const scale = Math.min(1, MAX_DIM / Math.max(srcW, srcH));
  const outW = Math.max(1, Math.round(srcW * scale));
  const outH = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to initialize document processor.');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, outW, outH);
  ctx.drawImage(drawable, 0, 0, outW, outH);

  const blob = await canvasToJpegBlob(canvas, 0.88);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

  return {
    blob,
    dataUrl,
    width: outW,
    height: outH,
    sizeKb: Math.max(1, Math.round(blob.size / 1024)),
  };
}
