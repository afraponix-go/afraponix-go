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

    // Look only at the centre region (where the guide sits): how much detail
    // (sharpness/closeness) and leaf-green it holds.
    function analyze() {
      const v = videoRef.current
      if (!v || v.readyState < 2 || !sctx) return
      const side = Math.min(v.videoWidth, v.videoHeight) * 0.6
      const cx = (v.videoWidth - side) / 2
      const cy = (v.videoHeight - side) / 2
      sctx.drawImage(v, cx, cy, side, side, 0, 0, 96, 96)
      const d = sctx.getImageData(0, 0, 96, 96).data
      const n = 96 * 96
      let green = 0
      let sum = 0
      let sumSq = 0
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i]
        const g = d[i + 1]
        const b = d[i + 2]
        const l = 0.299 * r + 0.587 * g + 0.114 * b
        sum += l
        sumSq += l * l
        if (g > r * 1.03 && g > b * 1.03 && g > 50) green++
      }
      const mean = sum / n
      const std = Math.sqrt(Math.max(0, sumSq / n - mean * mean)) // detail / focus
      const cover = green / n // how much the plant fills the centre

      if (std > 38 && cover > 0.22) {
        setLevel('ready')
        setHint('Looks sharp — tap to capture')
      } else if (std > 20 || cover > 0.12) {
        setLevel('mid')
        setHint(cover < 0.12 ? 'Move closer — fill the circle' : 'Almost — hold steady')
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
