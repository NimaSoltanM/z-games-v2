// Client-side image normalization done before upload: shrinks big photos and
// optionally center-crops to a target aspect, so we send a small file over slow
// connections and store consistent framing. The backend still re-validates and
// re-encodes — this is an optimization, not a security boundary. Any failure
// falls back to uploading the original file untouched.

export const MIN_COVER_WIDTH = 600
export const MIN_COVER_HEIGHT = 800

type DownscaleOpts = {
  /** Cap for the longest edge of the result, in pixels. */
  maxDim?: number
  /** JPEG quality 0–1. */
  quality?: number
  /** Center-crop to this width/height ratio (e.g. 3/4). Omit to keep aspect. */
  aspect?: number
  /** Minimum usable source width after applying the requested crop. */
  minWidth?: number
  /** Minimum usable source height after applying the requested crop. */
  minHeight?: number
}

export class ImageTooSmallError extends Error {
  constructor(
    readonly usableWidth: number,
    readonly usableHeight: number,
    readonly minWidth: number,
    readonly minHeight: number
  ) {
    super(
      `Usable image dimensions ${usableWidth}x${usableHeight} are below the required ${minWidth}x${minHeight}`
    )
    this.name = "ImageTooSmallError"
  }
}

export function usableImageDimensions(
  width: number,
  height: number,
  aspect?: number
): { width: number; height: number } {
  if (!aspect || aspect <= 0) return { width, height }

  const currentAspect = width / height
  if (currentAspect > aspect) {
    return { width: Math.round(height * aspect), height }
  }
  if (currentAspect < aspect) {
    return { width, height: Math.round(width / aspect) }
  }
  return { width, height }
}

type Drawable = {
  img: CanvasImageSource
  w: number
  h: number
  cleanup: () => void
}

async function loadDrawable(file: File): Promise<Drawable> {
  if (typeof createImageBitmap === "function") {
    const bmp = await createImageBitmap(file)
    return { img: bmp, w: bmp.width, h: bmp.height, cleanup: () => bmp.close() }
  }
  const url = URL.createObjectURL(file)
  try {
    const el = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error("decode failed"))
      i.src = url
    })
    return {
      img: el,
      w: el.naturalWidth,
      h: el.naturalHeight,
      cleanup: () => URL.revokeObjectURL(url),
    }
  } catch (e) {
    URL.revokeObjectURL(url)
    throw e
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), type, quality)
  )
}

export async function downscaleImage(
  file: File,
  opts: DownscaleOpts = {}
): Promise<File> {
  const { maxDim = 1600, quality = 0.85, aspect, minWidth, minHeight } = opts
  try {
    const { img, w: iw, h: ih, cleanup } = await loadDrawable(file)
    try {
      // Center-crop the source rect to the target aspect, if requested.
      let sx = 0
      let sy = 0
      const usable = usableImageDimensions(iw, ih, aspect)
      const sw = usable.width
      const sh = usable.height
      if (sw !== iw) sx = Math.round((iw - sw) / 2)
      if (sh !== ih) sy = Math.round((ih - sh) / 2)

      if (
        (minWidth !== undefined && sw < minWidth) ||
        (minHeight !== undefined && sh < minHeight)
      ) {
        throw new ImageTooSmallError(sw, sh, minWidth ?? 0, minHeight ?? 0)
      }

      // Scale so the long edge is at most maxDim.
      const longEdge = Math.max(sw, sh)
      const scale = longEdge > maxDim ? maxDim / longEdge : 1
      const dw = Math.max(1, Math.round(sw * scale))
      const dh = Math.max(1, Math.round(sh * scale))

      const canvas = document.createElement("canvas")
      canvas.width = dw
      canvas.height = dh
      const ctx = canvas.getContext("2d")
      if (!ctx) return file
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh)

      const blob = await canvasToBlob(canvas, "image/jpeg", quality)
      if (!blob) return file
      // With no crop, keep the original if processing didn't actually shrink it
      // (already-tiny images). With a crop we always want the reframed result.
      if (!aspect && blob.size >= file.size) return file

      const base = file.name.replace(/\.[^.]+$/, "") || "image"
      return new File([blob], `${base}.jpg`, { type: "image/jpeg" })
    } finally {
      cleanup()
    }
  } catch (error) {
    if (error instanceof ImageTooSmallError) throw error
    return file
  }
}
