import { ensurePhotoPermission } from './permissions';

/** Reads an image file and downscales it to a compact JPEG data URL for local storage. */
export async function shrinkImage(file: File, max = 900, quality = 0.72): Promise<string> {
  // On Android 13+ gallery access needs a runtime grant. The system picker also
  // works with partial access, so a denial simply falls through to the picker.
  await ensurePhotoPermission();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
