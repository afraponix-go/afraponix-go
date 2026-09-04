// Shrink a camera photo before upload so field uploads stay small (a 10 MB phone
// photo becomes a few hundred KB). Runs entirely client-side. Any failure falls
// back to the original file so a capture is never blocked.
export async function downscaleImage(
  file: File,
  { maxEdge = 1600, quality = 0.82 }: { maxEdge?: number; quality?: number } = {},
): Promise<File> {
  if (!file.type.startsWith('image/')) return file

  let src: ImageBitmap | HTMLImageElement | null = null
  let url: string | null = null
  try {
    // createImageBitmap applies EXIF orientation (from-image) so photos aren't
    // rotated; fall back to an <img> where it's unavailable/unsupported.
    if (typeof createImageBitmap === 'function') {
      try {
        src = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
      } catch {
        src = null
      }
    }
    if (!src) {
      url = URL.createObjectURL(file)
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('decode failed'))
        img.src = url as string
      })
      src = img
    }

    const sw = 'naturalWidth' in src ? src.naturalWidth : src.width
    const sh = 'naturalHeight' in src ? src.naturalHeight : src.height
    if (!sw || !sh) return file

    const scale = Math.min(1, maxEdge / Math.max(sw, sh))
    const w = Math.max(1, Math.round(sw * scale))
    const h = Math.max(1, Math.round(sh * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(src, 0, 0, w, h)

    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', quality))
    // Don't upload a re-encode that ended up larger (e.g. an already-tiny image).
    if (!blob || blob.size >= file.size) return file

    const name = file.name.replace(/\.[^./\\]+$/, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() })
  } catch {
    return file
  } finally {
    if (src && 'close' in src) (src as ImageBitmap).close()
    if (url) URL.revokeObjectURL(url)
  }
}
