/**
 * Hook to add watermark to images when user downloads them
 * Watermark: "Reelsy @ username" in liquid glass style on bottom right
 */
export const useImageWatermark = () => {
  const addWatermarkToImage = async (
    imageUrl: string,
    username: string,
    fileName: string = 'reelsy-image.png'
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Watermark text
        const watermarkText = `Reelsy @${username}`;
        const fontSize = Math.max(20, img.width * 0.04); // 4% of image width

        // Create liquid glass effect with multiple layers
        ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';

        const padding = 20;
        const x = canvas.width - padding;
        const y = canvas.height - padding;

        // Measure text
        const metrics = ctx.measureText(watermarkText);
        const textWidth = metrics.width;
        const textHeight = fontSize * 1.2;

        // Draw semi-transparent background box (frosted glass effect)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.roundRect(
          x - textWidth - 20,
          y - textHeight,
          textWidth + 40,
          textHeight + 10,
          [8]
        );
        ctx.fill();

        // Draw subtle border (glass edge)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(
          x - textWidth - 20,
          y - textHeight,
          textWidth + 40,
          textHeight + 10,
          [8]
        );
        ctx.stroke();

        // Draw main white text
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillText(watermarkText, x - 10, y - 5);

        // Draw shadow layer for depth
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillText(watermarkText, x - 9, y - 4);

        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, 'image/png', 0.95);
      };

      img.onerror = () => {
        reject(new Error(`Failed to load image: ${imageUrl}`));
      };

      img.src = imageUrl;
    });
  };

  const downloadImageWithWatermark = async (
    imageUrl: string,
    username: string,
    fileName?: string
  ) => {
    try {
      const blob = await addWatermarkToImage(imageUrl, username, fileName);

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || `reelsy-@${username}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image with watermark:', error);
      throw error;
    }
  };

  return {
    addWatermarkToImage,
    downloadImageWithWatermark,
  };
};
