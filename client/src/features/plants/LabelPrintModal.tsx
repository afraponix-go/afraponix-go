import { QRCodeSVG } from 'qrcode.react'
import { Modal } from '../../components/Modal'
import './labels.css'

// Print a single QR label — e.g. the one you stick on a seed tray right after
// sowing. Wraps the label in `.label-sheet` so the existing print CSS prints
// only the label.
export function LabelPrintModal({ url, title, line1, line2, onClose }: {
  url: string
  title: string
  line1?: string
  line2?: string
  onClose: () => void
}) {
  return (
    <Modal title="Batch label" onClose={onClose}>
      <p style={{ margin: '0 0 12px', color: 'var(--ink-soft)', fontSize: 13 }}>
        Print and stick this on the batch. Scanning it opens the batch in the app.
      </p>
      <div className="label-sheet single">
        <div className="qr-label">
          <div className="label-qr"><QRCodeSVG value={url} size={128} level="Q" marginSize={0} /></div>
          <div className="label-info">
            <span className="label-batch">{title}</span>
            {line1 && <span className="label-crop">{line1}</span>}
            {line2 && <span className="label-sub">{line2}</span>}
          </div>
        </div>
      </div>
      <div className="mform-actions">
        <button type="button" className="ghost" onClick={onClose}>Close</button>
        <button type="button" className="btn" onClick={() => window.print()}>Print</button>
      </div>
    </Modal>
  )
}
