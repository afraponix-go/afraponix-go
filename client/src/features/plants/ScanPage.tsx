import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import jsQR from 'jsqr'
import './scan.css'

// Camera QR scanner. Decodes a batch label and jumps to its /b action sheet.
// Needs HTTPS (prod is behind Cloudflare) or localhost for camera access.
export function ScanPage() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState('Point the camera at a batch label')

  useEffect(() => {
    let stream: MediaStream | null = null
    let raf = 0
    let done = false
    const canvas = document.createElement('canvas')

    // Turn a decoded string into an in-app path if it's one of our /b links.
    function toBatchPath(data: string): string | null {
      try {
        const u = new URL(data, window.location.origin)
        if (u.pathname === '/b' && (u.searchParams.has('b') || u.searchParams.has('sb'))) return u.pathname + u.search
      } catch {
        /* not a URL */
      }
      return null
    }

    const tick = () => {
      if (done) return
      const v = videoRef.current
      if (v && v.readyState === v.HAVE_ENOUGH_DATA) {
        canvas.width = v.videoWidth
        canvas.height = v.videoHeight
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (ctx) {
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })
          if (code?.data) {
            const path = toBatchPath(code.data)
            if (path) {
              done = true
              navigate(path)
              return
            }
            setHint('That QR isn’t an Afraponix batch label — keep looking')
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        const v = videoRef.current
        if (!v) return
        v.srcObject = stream
        await v.play()
        raf = requestAnimationFrame(tick)
      } catch {
        setError('Can’t open the camera. Allow camera access, or make sure you’re on https / localhost.')
      }
    }
    start()

    return () => {
      done = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [navigate])

  return (
    <div className="scan-wrap">
      <h2 className="section-title" style={{ marginTop: 0 }}>Scan a batch</h2>
      {error ? (
        <div className="empty">{error}</div>
      ) : (
        <div className="scanner">
          <video ref={videoRef} className="scanner-video" muted playsInline />
          <div className="scanner-reticle" aria-hidden />
          <p className="scanner-hint">{hint}</p>
        </div>
      )}
    </div>
  )
}
