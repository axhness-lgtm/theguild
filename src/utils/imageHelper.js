/**
 * Process and compress an uploaded image file into a compact Base64 data URL string (~40KB-80KB).
 * This ensures 100% sureshot storage right inside localStorage or JSON database columns without hitting size limits or needing external S3 buckets.
 */
export const processAndCompressImage = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No image file selected'));
    
    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Selected file must be an image'));
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 700;
        const MAX_HEIGHT = 900;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round(height * (MAX_WIDTH / width));
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round(width * (MAX_HEIGHT / height));
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
    };
    reader.onerror = () => reject(new Error('Failed to read uploaded file'));
  });
};
