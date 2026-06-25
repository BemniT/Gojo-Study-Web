import { POST_IMAGE_MAX_BYTES, POST_IMAGE_MAX_DIMENSION } from './dashboardConstants';

/**
 * Compresses an image to JPEG using canvas with a quality + resize step ladder.
 * Dashboard post composer specific: tries 5 quality steps at 3 resize factors
 * before giving up. If the resulting blob is not smaller than the original,
 * returns the original file untouched.
 *
 * Returns:
 *   { file, originalSize, finalSize, wasCompressed, wasConvertedToJpeg }
 */
export async function compressPostImageToJpeg(
  file,
  {
    maxDimension = POST_IMAGE_MAX_DIMENSION,
    maxBytes = POST_IMAGE_MAX_BYTES,
    nameSuffix = '',
  } = {},
) {
  if (!file || !String(file.type || '').startsWith('image/') || file.type === 'image/svg+xml') {
    return {
      file,
      originalSize: Number(file?.size || 0),
      finalSize: Number(file?.size || 0),
      wasCompressed: false,
      wasConvertedToJpeg: false,
    };
  }

  const imageUrl = URL.createObjectURL(file);

  try {
    const imageElement = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Unable to process selected image.'));
      image.src = imageUrl;
    });

    const originalWidth = imageElement.naturalWidth || imageElement.width;
    const originalHeight = imageElement.naturalHeight || imageElement.height;
    const scale = Math.min(1, maxDimension / Math.max(originalWidth, originalHeight));
    let targetWidth = Math.max(1, Math.round(originalWidth * scale));
    let targetHeight = Math.max(1, Math.round(originalHeight * scale));
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false });

    if (!context) {
      return {
        file,
        originalSize: Number(file.size || 0),
        finalSize: Number(file.size || 0),
        wasCompressed: false,
        wasConvertedToJpeg: false,
      };
    }

    const renderImage = () => {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, targetWidth, targetHeight);
      context.drawImage(imageElement, 0, 0, targetWidth, targetHeight);
    };

    const canvasToBlob = (quality) => new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) { resolve(blob); return; }
        reject(new Error('Unable to optimize selected image.'));
      }, 'image/jpeg', quality);
    });

    renderImage();

    const qualitySteps = [0.78, 0.68, 0.58, 0.48, 0.4];
    const resizeSteps = [1, 0.88, 0.76];
    let bestBlob = null;

    for (const resizeFactor of resizeSteps) {
      targetWidth = Math.max(1, Math.round(originalWidth * scale * resizeFactor));
      targetHeight = Math.max(1, Math.round(originalHeight * scale * resizeFactor));
      renderImage();

      for (const quality of qualitySteps) {
        const candidateBlob = await canvasToBlob(quality);
        bestBlob = candidateBlob;
        if (candidateBlob.size <= maxBytes) break;
      }

      if (bestBlob && bestBlob.size <= maxBytes) break;
    }

    if (!bestBlob || bestBlob.size >= file.size) {
      return {
        file,
        originalSize: Number(file.size || 0),
        finalSize: Number(file.size || 0),
        wasCompressed: false,
        wasConvertedToJpeg: false,
      };
    }

    const baseFileName = file.name.replace(/\.[^.]+$/, '') || 'post-image';
    const jpegFile = new File(
      [bestBlob],
      `${baseFileName}${nameSuffix ? `-${nameSuffix}` : ''}.jpg`,
      { type: 'image/jpeg', lastModified: Date.now() },
    );

    return {
      file: jpegFile,
      originalSize: Number(file.size || 0),
      finalSize: Number(jpegFile.size || 0),
      wasCompressed: jpegFile.size < file.size,
      wasConvertedToJpeg: file.type !== 'image/jpeg',
    };
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
