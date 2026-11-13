'use client';

export interface ResizeImageOptions {
  maxSize?: number;
  cropSquare?: boolean;
  preserveAlpha?: boolean;
}

/**
 * Verkleint een gekozen afbeeldingsbestand direct in de browser naar een
 * compacte, veilige Data-URL (zodat ook grote smartphonefoto's van 10+ MB
 * moeiteloos en snel opgeslagen kunnen worden).
 */
export async function resizeImageFileToDataUrl(
  file: File,
  options: ResizeImageOptions = {}
): Promise<string> {
  const maxSize = options.maxSize ?? 256;
  const cropSquare = options.cropSquare ?? true;
  const preserveAlpha = options.preserveAlpha ?? false;

  if (!file.type.startsWith('image/')) {
    throw new Error('Kies alstublieft een geldig afbeeldingsbestand (JPG, PNG of WebP).');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Afbeelding kon niet worden verwerkt in deze browser.');
    }

    if (cropSquare) {
      canvas.width = maxSize;
      canvas.height = maxSize;

      if (!preserveAlpha) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, maxSize, maxSize);
      }

      const minSide = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height);
      const sx = ((img.naturalWidth || img.width) - minSide) / 2;
      const sy = ((img.naturalHeight || img.height) - minSide) / 2;

      ctx.drawImage(
        img,
        sx,
        sy,
        minSide,
        minSide,
        0,
        0,
        maxSize,
        maxSize
      );
    } else {
      const srcW = img.naturalWidth || img.width || maxSize;
      const srcH = img.naturalHeight || img.height || maxSize;
      const scale = Math.min(maxSize / srcW, maxSize / srcH, 1);
      const targetW = Math.max(1, Math.round(srcW * scale));
      const targetH = Math.max(1, Math.round(srcH * scale));

      canvas.width = targetW;
      canvas.height = targetH;

      if (!preserveAlpha) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetW, targetH);
      }
      ctx.drawImage(img, 0, 0, targetW, targetH);
    }

    if (preserveAlpha) {
      const webp = canvas.toDataURL('image/webp', 0.88);
      if (webp.startsWith('data:image/webp')) {
        return webp;
      }
      return canvas.toDataURL('image/png');
    }

    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error('Het gekozen bestand kon niet als foto worden geopend.'));
    img.src = src;
  });
}
