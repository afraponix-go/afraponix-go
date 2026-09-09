import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { useSystems } from '../systems/SystemContext'
import { fetchFishInventory } from './api'
import { fmt } from './fishShared'
import { tankScanUrl } from './tankQr'
import '../plants/plants.css'
import '../plants/labels.css'

// Print a sheet of QR labels — one per tank — that stay physically on the tank.
// Each QR deep-links to the tank's action sheet when scanned.
export function TankLabels() {
  const { activeId, activeSystem } = useSystems()
  const [excluded, setExcluded] = useState<Set<number>>(new Set())

  const { data: tanks = [], isLoading, isError } = useQuery({
    queryKey: ['fish-inventory', activeId],
    queryFn: () => fetchFishInventory(activeId as string),
    enabled: !!activeId,
  })

  const shown = useMemo(() => tanks.slice().sort((a, b) => a.tank_number - b.tank_number), [tanks])
  const includedCount = shown.filter((t) => !excluded.has(t.fish_tank_id)).length

  if (!activeId) return <div className="empty">Select a system to print its tank labels.</div>
  if (isLoading) return <div className="empty">Loading tanks…</div>
  if (isError) return <div className="empty">Could not load tanks.</div>

  const toggle = (id: number) =>
    setExcluded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  const selectAll = () => setExcluded(new Set())
  const clearAll = () => setExcluded(new Set(shown.map((t) => t.fish_tank_id)))

  return (
    <div>
      <div className="labels-head">
        <h2 className="section-title" style={{ margin: 0 }}>Tank labels</h2>
        <div className="labels-tools">
          <button className="ghost" onClick={selectAll}>Select all</button>
          <button className="ghost" onClick={clearAll}>Clear</button>
          <span className="labels-count">{includedCount} label{includedCount === 1 ? '' : 's'}</span>
          <button className="btn feed-btn" onClick={() => window.print()} disabled={includedCount === 0}>Print</button>
        </div>
      </div>
      <p className="labels-sub">
        {activeSystem?.system_name} · scan a label to open the tank. Prints on A4 sticker paper (3-across, 24-up). Untick a label to leave it off this run.
      </p>

      {shown.length === 0 ? (
        <div className="empty">No fish tanks configured yet.</div>
      ) : (
        <div className="label-sheet-wrap">
          <div className="label-sheet">
            {shown.map((t) => {
              const out = excluded.has(t.fish_tank_id)
              return (
                <div className={`qr-label${out ? ' is-out' : ''}`} key={t.fish_tank_id}>
                  <input
                    type="checkbox"
                    className="label-pick"
                    checked={!out}
                    onChange={() => toggle(t.fish_tank_id)}
                    aria-label={`Include Tank ${t.tank_number}`}
                  />
                  <div className="label-qr">
                    <QRCodeSVG value={tankScanUrl(activeId, t.fish_tank_id)} size={96} level="Q" marginSize={0} />
                  </div>
                  <div className="label-info">
                    <span className="label-batch">Tank {t.tank_number}</span>
                    <span className="label-crop" style={{ textTransform: 'capitalize' }}>{t.tank_fish_type ?? 'Fish'}</span>
                    <span className="label-sub">{fmt(t.current_count)} fish · {fmt(t.volume_liters)} L</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
