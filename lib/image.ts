// Client-only helper (uses canvas / DOM). Imported by the listing form to shrink
// photos before they're uploaded through a Server Action — keeps requests under
// the body-size limit and saves storage.

const MAX_DIMENSION = 1600; // longest edge, in pixels
const JPEG_QUALITY = 0.8;

/**
 * Resize an image file so its longest edge is at most MAX_DIMENSION and
 * re-encode it as JPEG. Returns a new File. Non-images are returned unchanged,
 * and if anything goes wrong the original file is returned as a safe fallback.
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  try {
    // Respect EXIF orientation so phone photos aren't rotated.
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });

    let { width, height } = bitmap;
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
