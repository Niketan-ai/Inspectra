/**
 * Mobile-Safe Image Processing Utility
 *
 * Handles camera capture and gallery uploads.
 * Downsamples high-resolution phone camera photos (12-48MP) to a safe,
 * high-clarity maximum dimension (2048px) with high quality smoothing.
 * Prevents mobile browser memory overflow crashes (white-screen on iOS Safari / Chrome).
 */

export interface ProcessedImageResult {
  dataUrl: string;
  base64Data: string;
  originalWidth: number;
  originalHeight: number;
  width: number;
  height: number;
  fileSizeBytes: number;
  fileName: string;
  mimeType: string;
}

const MAX_DIMENSION = 2048; // Preserves 4pt-6pt statutory fine print while remaining < 1MB
const COMPRESSION_QUALITY = 0.88;
const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024; // 30MB safety threshold

/**
 * Safely processes and compresses a File or Blob for mobile upload
 */
export async function processMobileImage(
  file: File | Blob,
  fileName: string = 'package_photo.jpg'
): Promise<ProcessedImageResult> {
  return new Promise((resolve, reject) => {
    // 1. File size check to protect mobile memory
    if (file.size && file.size > MAX_FILE_SIZE_BYTES) {
      return reject(new Error('Photo is too large to process. Please try again.'));
    }

    if (file.size === 0) {
      return reject(new Error('Photo file is empty. Please capture again.'));
    }

    // 2. Validate that it is an image
    if (file.type && !file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image.'));
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const originalWidth = img.naturalWidth || img.width;
        const originalHeight = img.naturalHeight || img.height;

        if (!originalWidth || !originalHeight) {
          img.src = '';
          URL.revokeObjectURL(objectUrl);
          return reject(new Error('Invalid image dimensions.'));
        }

        // Calculate proportional scale
        let width = originalWidth;
        let height = originalHeight;

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        // Render to canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) {
          img.src = '';
          URL.revokeObjectURL(objectUrl);
          return reject(new Error('Canvas context could not be acquired.'));
        }

        // High quality bicubic interpolation to preserve fine label typography
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw background white in case of transparent PNG/WEBP
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPEG data URL
        const dataUrl = canvas.toDataURL('image/jpeg', COMPRESSION_QUALITY);
        
        // Mobile cleanup: free canvas and image references immediately
        canvas.width = 0;
        canvas.height = 0;
        img.src = '';
        URL.revokeObjectURL(objectUrl);

        // Estimate byte size from base64
        const stringLength = dataUrl.length - 'data:image/jpeg;base64,'.length;
        const fileSizeBytes = Math.round((stringLength * 3) / 4);

        resolve({
          dataUrl,
          base64Data: dataUrl,
          originalWidth,
          originalHeight,
          width,
          height,
          fileSizeBytes,
          fileName,
          mimeType: 'image/jpeg'
        });
      } catch (err) {
        img.src = '';
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      img.src = '';
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load packaging photograph.'));
    };

    img.src = objectUrl;
  });
}
