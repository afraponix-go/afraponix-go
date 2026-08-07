import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { ApiError } from '../../lib/apiClient'
import {
  EXPORT_TYPES,
  IMPORT_TYPES,
  exportCsv,
  downloadTemplate,
  importFile,
  fetchImportHistory,
  undoImport,
  type ExportType,
  type ImportType,
  type ImportResult,
} from './api'
import './importexport.css'

function fmtDate(v?: string | null): string {
  if (!v) return '—'
  const d = String(v).slice(0, 10)
  return d
}

export function ImportExportPage() {
  const { activeId } = useSystems()
  const qc = useQueryClient()

  // Export state
  const [exportType, setExportType] = useState<ExportType>('water_quality')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [exportMsg, setExportMsg] = useState<string | null>(null)
  const [exportErr, setExportErr] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  // Import state
  const [importType, setImportType] = useState<ImportType>('water_quality')
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [importErr, setImportErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const historyQ = useQuery({
    queryKey: ['import-history', activeId],
    queryFn: () => fetchImportHistory(activeId as string),
    enabled: !!activeId,
  })

  const importMut = useMutation({
    mutationFn: () => importFile(importType, activeId as string, file as File),
    onSuccess: (res) => {
      setResult(res)
      setImportErr(null)
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      qc.invalidateQueries({ queryKey: ['import-history', activeId] })
      // Freshly imported data should show up elsewhere.
      qc.invalidateQueries({ queryKey: ['water-quality-history', activeId] })
    },
    onError: (e) => setImportErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Import failed.'),
  })

  const undoMut = useMutation({
    mutationFn: (id: number) => undoImport(id),
    onSuccess: () => {
      setResult(null)
      qc.invalidateQueries({ queryKey: ['import-history', activeId] })
      qc.invalidateQueries({ queryKey: ['water-quality-history', activeId] })
    },
  })

  if (!activeId) return <div className="empty">Select a system to import or export data.</div>

  async function onExport() {
    setExportMsg(null)
    setExportErr(null)
    setExporting(true)
    try {
      const n = await exportCsv(exportType, activeId as string, { from: from || undefined, to: to || undefined })
      setExportMsg(n === 0 ? 'No records found for that selection.' : `Exported ${n} record${n === 1 ? '' : 's'}.`)
    } catch (e) {
      setExportErr(e instanceof ApiError ? e.message : 'Could not export. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  async function onTemplate() {
    setImportErr(null)
    try {
      await downloadTemplate(importType, activeId as string)
    } catch (e) {
      setImportErr(e instanceof Error ? e.message : 'Could not download the template.')
    }
  }

  const history = historyQ.data ?? []

  return (
    <div className="io-grid">
      {/* Export */}
      <section className="io-card">
        <h2>Export data</h2>
        <p className="io-sub">Download your records as a CSV file (opens in Excel or Sheets).</p>

        <div className="io-field">
          <label htmlFor="io-export-type">Data</label>
          <select id="io-export-type" value={exportType} onChange={(e) => setExportType(e.target.value as ExportType)}>
            {EXPORT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="io-row">
          <div className="io-field">
            <label htmlFor="io-from">From <span className="io-hint">· optional</span></label>
            <input id="io-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="io-field">
            <label htmlFor="io-to">To <span className="io-hint">· optional</span></label>
            <input id="io-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        {exportErr && <div className="io-msg err">{exportErr}</div>}
        {exportMsg && <div className="io-msg ok">{exportMsg}</div>}

        <button className="io-btn primary" type="button" onClick={onExport} disabled={exporting}>
          {exporting ? 'Preparing…' : 'Download CSV'}
        </button>
      </section>

      {/* Import */}
      <section className="io-card">
        <h2>Import data</h2>
        <p className="io-sub">Upload a CSV. Start from the template so the columns line up.</p>

        <div className="io-field">
          <label htmlFor="io-import-type">Data</label>
          <select id="io-import-type" value={importType} onChange={(e) => { setImportType(e.target.value as ImportType); setResult(null) }}>
            {IMPORT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <button className="io-link" type="button" onClick={onTemplate}>↓ Download {IMPORT_TYPES.find((t) => t.value === importType)?.label} template</button>

        <div className="io-field">
          <label htmlFor="io-file">CSV file</label>
          <input id="io-file" ref={fileRef} type="file" accept=".csv,text/csv" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); setImportErr(null) }} />
        </div>

        {importErr && <div className="io-msg err">{importErr}</div>}
        {result && (
          <div className={`io-msg ${result.success ? (result.errors ? 'warn' : 'ok') : 'err'}`}>
            <div>{result.message}</div>
            {result.errorDetails && result.errorDetails.length > 0 && (
              <ul className="io-errlist">
                {result.errorDetails.map((e, i) => <li key={i}>{e}</li>)}
                {result.moreErrors && <li>{result.moreErrors}</li>}
              </ul>
            )}
          </div>
        )}

        <button className="io-btn primary" type="button" onClick={() => importMut.mutate()} disabled={!file || importMut.isPending}>
          {importMut.isPending ? 'Importing…' : 'Import'}
        </button>

        {history.length > 0 && (
          <div className="io-history">
            <h3>Recent imports</h3>
            <ul>
              {history.map((h) => (
                <li key={h.id}>
                  <span className="io-hist-main">
                    <b>{h.import_type}</b> · {h.records_imported} imported
                    {h.records_errors ? `, ${h.records_errors} errors` : ''}
                    {h.records_duplicates ? `, ${h.records_duplicates} dupes` : ''}
                  </span>
                  <span className="io-hist-date">{fmtDate(h.import_date)}</span>
                  <button className="io-undo" type="button" onClick={() => undoMut.mutate(h.id)} disabled={undoMut.isPending}>Undo</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  )
}
