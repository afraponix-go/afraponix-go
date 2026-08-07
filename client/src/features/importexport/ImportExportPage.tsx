import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { ApiError } from '../../lib/apiClient'
import {
  EXPORT_TYPES,
  IMPORT_TYPES,
  exportCsv,
  downloadTemplate,
  importFile,
  type ExportType,
  type ImportType,
  type ImportResult,
} from './api'
import './importexport.css'

export function ImportExportPage() {
  const { activeId } = useSystems()
  const qc = useQueryClient()

  const [exportType, setExportType] = useState<ExportType>('water_quality')
  const [exportMsg, setExportMsg] = useState<string | null>(null)
  const [exportErr, setExportErr] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const [importType, setImportType] = useState<ImportType>('water_quality')
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [importErr, setImportErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const importMut = useMutation({
    mutationFn: () => importFile(importType, activeId as string, file as File),
    onSuccess: (res) => {
      setResult(res)
      setImportErr(null)
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      // Freshly imported readings should show up in the Water Quality tab + charts.
      qc.invalidateQueries({ queryKey: ['water-quality-history', activeId] })
      qc.invalidateQueries({ queryKey: ['nutrients', activeId] })
    },
    onError: (e) => setImportErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Import failed.'),
  })

  if (!activeId) return <div className="empty">Select a system to import or export data.</div>

  async function onExport() {
    setExportMsg(null)
    setExportErr(null)
    setExporting(true)
    try {
      const n = await exportCsv(exportType, activeId as string)
      setExportMsg(n === 0 ? 'No records found to export.' : `Exported ${n} record${n === 1 ? '' : 's'}.`)
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
              </ul>
            )}
          </div>
        )}

        <button className="io-btn primary" type="button" onClick={() => importMut.mutate()} disabled={!file || importMut.isPending}>
          {importMut.isPending ? 'Importing…' : 'Import'}
        </button>
      </section>
    </div>
  )
}
