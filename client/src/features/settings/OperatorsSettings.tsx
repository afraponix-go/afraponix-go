import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../lib/apiClient'
import { fetchOperators, addOperator, deleteOperator, type Operator } from '../spray/api'
import '../fish/fish.css'
import '../plants/plants.css'

export function OperatorsSettings() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { data: operators = [], isLoading } = useQuery({ queryKey: ['spray-operators'], queryFn: fetchOperators })

  const add = useMutation({
    mutationFn: (n: string) => addOperator(n),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['spray-operators'] }); setName('') },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not add operator.'),
  })
  const del = useMutation({
    mutationFn: (o: Operator) => deleteOperator(o.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spray-operators'] }),
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (name.trim()) add.mutate(name.trim())
  }

  return (
    <div>
      <h2 className="section-title" style={{ marginTop: 0 }}>Spray operators</h2>
      <p style={{ margin: '0 0 16px', color: 'var(--ink-faint)', fontSize: 13, maxWidth: '60ch' }}>
        The people who apply sprays. They appear in the operator dropdown when recording a spray application.
      </p>

      <form className="mform" style={{ maxWidth: 420 }} onSubmit={submit}>
        {error && <div className="wq-error">{error}</div>}
        <div className="field">
          <label htmlFor="op-name">Add operator</label>
          <div className="op-add">
            <input id="op-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
            <button type="submit" className="btn" disabled={add.isPending || !name.trim()}>{add.isPending ? 'Adding…' : 'Add'}</button>
          </div>
        </div>
      </form>

      {isLoading ? (
        <div className="empty">Loading…</div>
      ) : operators.length === 0 ? (
        <div className="empty" style={{ maxWidth: 420 }}>No operators yet — add one above.</div>
      ) : (
        <div className="op-list">
          {operators.map((o) => (
            <div key={o.id} className="op-item">
              <span>{o.name}</span>
              <button className="link-btn danger" disabled={del.isPending} onClick={() => del.mutate(o)}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
