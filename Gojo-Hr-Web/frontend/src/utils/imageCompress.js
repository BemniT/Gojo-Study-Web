export function formatFileSize(bytes) {
  const numericBytes = Number(bytes || 0);
  if (!numericBytes) return '0 KB';
  if (numericBytes >= 1024 * 1024) {
    return `${(numericBytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${Math.max(1, Math.round(numericBytes / 1024))} KB`;
}

export async function compressImageToJpeg(file, { maxDimension = 960, maxBytes = 350 * 1024 } = {}) {
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

    const originalWidth = imageElement.naturalWidth || imageElement.width || 1;
    const originalHeight = imageElement.naturalHeight || imageElement.height || 1;
    const scale = Math.min(1, maxDimension / Math.max(originalWidth, originalHeight));
    let targetWidth = Math.max(1, Math.round(originalWidth * scale));
    let targetHeight = Math.max(1, Math.round(originalHeight * scale));
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false });

    if (!context) throw new Error('Canvas context unavailable.');

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
        reject(new Error('Image compression failed.'));
      }, 'image/jpeg', quality);
    });

    renderImage();

    const qualitySteps = [0.78, 0.68, 0.58, 0.48, 0.4];
    let bestBlob = null;

    for (const quality of qualitySteps) {
      const candidateBlob = await canvasToBlob(quality);
      bestBlob = candidateBlob;
      if (candidateBlob.size <= maxBytes) break;
    }

    if (bestBlob && bestBlob.size > maxBytes) {
      targetWidth = Math.max(480, Math.round(targetWidth * 0.8));
      targetHeight = Math.max(480, Math.round(targetHeight * 0.8));
      renderImage();
      bestBlob = await canvasToBlob(0.4);
    }

    if (!bestBlob) throw new Error('Image compression failed.');

    const jpegFile = new File(
      [bestBlob],
      `${file.name.replace(/\.[^.]+$/, '') || 'profile-image'}.jpg`,
      { type: 'image/jpeg', lastModified: Date.now() },
    );

    return {
      file: jpegFile,
      originalSize: Number(file.size || 0),
      finalSize: Number(jpegFile.size || 0),
      wasCompressed: jpegFile.size < file.size,
      wasConvertedToJpeg: true,
    };
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
