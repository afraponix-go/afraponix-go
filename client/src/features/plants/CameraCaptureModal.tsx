import { useEffect, useRef, useState } from 'react'
import { Modal } from '../../components/Modal'
import { downscaleImage } from './imageDownscale'
import './photos.css'

type Level = 'far' | 'mid' | 'ready'

// In-app camera with a centering guide and live "move closer / sharp enough"
// feedback, so operators frame the plant consistently. Guidance is advisory —
// capture is always allowed. Falls back to a file picker if the camera fails.
export function CameraCaptureModal({ onCapture, onClose, onFallback }: {
  onCapture: (file: File) => void
  onClose: () => void
  onFallback: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [level, setLevel] = useState<Level>('far')
  const [hint, setHint] = useState('Center the plant in the circle')

  useEffect(() => {
    let stream: MediaStream | null = null
    let timer: number | undefined
    const sample = document.createElement('canvas')
    sample.width = 96
    sample.height = 96
    const sctx = sample.getContext('2d', { willReadFrequently: true })

    // Look only at the centre region (where the guide sits) and gauge how much
    // real subject detail it holds — colour-agnostic, so it works for green
    // leaves and non-green flowers/fruit alike. Two signals: overall contrast
    // (a filled, textured subject spans a wide luminance range) and edge
    // sharpness (in focus / close). Green is deliberately NOT used.
    const W = 96
    const H = 96
    const N = W * H
    const luma = new Float32Array(N)
    function analyze() {
      const v = videoRef.current
      if (!v || v.readyState < 2 || !sctx) return
      const side = Math.min(v.videoWidth, v.videoHeight) * 0.6
      const cx = (v.videoWidth - side) / 2
      const cy = (v.videoHeight - side) / 2
      sctx.drawImage(v, cx, cy, side, side, 0, 0, W, H)
      const d = sctx.getImageData(0, 0, W, H).data
      let sum = 0
      for (let p = 0, i = 0; p < N; p++, i += 4) {
        const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
        luma[p] = l
        sum += l
      }
      const mean = sum / N
      let sq = 0
      let grad = 0
      let gcnt = 0
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const l = luma[y * W + x]
          sq += (l - mean) * (l - mean)
          if (x) {
            grad += Math.abs(l - luma[y * W + x - 1])
            gcnt++
          }
        }
      }
      const std = Math.sqrt(sq / N) // contrast — subject present & filling
      const sharp = grad / gcnt // edge detail — in focus / close

      if (sharp > 6 || std > 34) {
        setLevel('ready')
        setHint('Looks sharp — tap to capture')
      } else if (sharp > 3 || std > 20) {
        setLevel('mid')
        setHint('Almost — center the plant and hold steady')
      } else {
        setLevel('far')
        setHint('Move closer — fill the circle with the plant')
      }
    }

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        const v = videoRef.current
        if (!v) return
        v.srcObject = stream
        await v.play()
        timer = window.setInterval(analyze, 220)
      } catch {
        setError(true)
      }
    }
    start()

    return () => {
      if (timer) clearInterval(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  async function capture() {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    setBusy(true)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = v.videoWidth
      canvas.height = v.videoHeight
      canvas.getContext('2d')?.drawImage(v, 0, 0)
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.92))
      if (blob) {
        const small = await downscaleImage(new File([blob], 'photo.jpg', { type: 'image/jpeg' }))
        onCapture(small)
      }
    } finally {
      setBusy(false)
    }
  }

  if (error) {
    return (
      <Modal title="Take a photo" onClose={onClose}>
        <div className="empty">Can’t open the camera here. You can choose a photo instead.</div>
        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn" onClick={onFallback}>Choose a file</button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="Take a photo" onClose={onClose}>
      <div className="cam">
        <video ref={videoRef} className="cam-video" muted playsInline />
        <div className={`cam-guide ${level}`} aria-hidden />
        <div className={`cam-hint ${level}`}>{hint}</div>
      </div>
      <div className="cam-actions">
        <button type="button" className="link-btn" onClick={onFallback}>Choose file</button>
        <button
          type="button"
          className={`cam-shutter ${level === 'ready' ? 'ready' : ''}`}
          onClick={capture}
          disabled={busy}
          aria-label="Capture photo"
        />
        <button type="button" className="link-btn" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  )
}
