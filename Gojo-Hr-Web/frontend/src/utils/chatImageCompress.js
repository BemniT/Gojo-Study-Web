import { MAX_CHAT_IMAGE_BYTES } from './chatHelpers';

const loadImageFromFile = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image file'));
    };
    image.src = objectUrl;
  });

const canvasToJpegBlob = (canvas, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (output) => {
        if (!output) { reject(new Error('Image compression failed')); return; }
        resolve(output);
      },
      'image/jpeg',
      quality
    );
  });

export async function compressChatImageToJpeg(file, {
  maxWidth = 1080,
  maxHeight = 1080,
  maxBytes = MAX_CHAT_IMAGE_BYTES,
  initialQuality = 0.7,
  minimumQuality = 0.42,
  qualityStep = 0.08,
  dimensionStep = 0.86,
} = {}) {
  const image = await loadImageFromFile(file);

  let width = image.naturalWidth || image.width;
  let height = image.naturalHeight || image.height;
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);

  width = Math.max(1, Math.round(width * ratio));
  height = Math.max(1, Math.round(height * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas context unavailable');

  let bestBlob = null;
  let currentWidth = width;
  let currentHeight = height;

  for (let dimensionAttempt = 0; dimensionAttempt < 4; dimensionAttempt += 1) {
    canvas.width = currentWidth;
    canvas.height = currentHeight;
    context.clearRect(0, 0, currentWidth, currentHeight);
    context.drawImage(image, 0, 0, currentWidth, currentHeight);

    for (let quality = initialQuality; quality >= minimumQuality; quality -= qualityStep) {
      const blob = await canvasToJpegBlob(canvas, Number(quality.toFixed(2)));
      bestBlob = blob;
      if (blob.size <= maxBytes) return blob;
    }

    currentWidth = Math.max(480, Math.round(currentWidth * dimensionStep));
    currentHeight = Math.max(480, Math.round(currentHeight * dimensionStep));
  }

  if (!bestBlob) throw new Error('Image compression failed');
  return bestBlob;
}
