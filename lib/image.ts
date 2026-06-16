// Client-only helper (uses canvas / DOM). Imported by the listing form to shrink
// photos before they're uploaded through a Server Action — keeps requests under
// the body-size limit and saves storage.

const MAX_DIMENSION = 1600; // longest edge, in pixels
const JPEG_QUALITY = 0.8;

/** True for Apple HEIC/HEIF photos, which browsers can't render directly. */
function isHeic(file: File): boolean {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return (
    type === "image/heic" ||
    type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

/**
 * Convert a HEIC/HEIF file to a JPEG File using heic2any (loaded on demand so
 * the wasm decoder isn't in the main bundle). Returns the original on failure.
 */
async function heicToJpeg(file: File): Promise<File> {
  try {
    const { default: heic2any } = await import("heic2any");
    const out = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.9,
    });
    const blob = Array.isArray(out) ? out[0] : out;
    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/**
 * Resize an image file so its longest edge is at most MAX_DIMENSION and
 * re-encode it as JPEG. HEIC/HEIF photos (iPhone) are converted to JPEG first.
 * Non-images are returned unchanged, and if anything goes wrong the input file
 * is returned as a safe fallback.
 */
export async function compressImage(input: File): Promise<File> {
  if (!input.type.startsWith("image/") && !isHeic(input)) return input;

  // iPhone HEIC can't be decoded by canvas/createImageBitmap — convert first.
  const file = isHeic(input) ? await heicToJpeg(input) : input;

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
