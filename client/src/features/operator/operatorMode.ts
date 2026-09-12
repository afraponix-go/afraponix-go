import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useSystems } from '../systems/SystemContext'
import { isOwnedSystem, type System } from '../systems/api'

const VIEW_AS_KEY = 'afraponix_view_as_operator'

// Is the active system's share level literally 'operator' — a real restricted
// account, not an owner/admin previewing it?
function isRealOperatorSystem(s: System | null): boolean {
  if (!s || s.is_owner === 1) return false
  return s.shared_permission === 'operator'
}

// Does this account have real management access anywhere — owns a system, is a
// global admin, or holds a collaborator/admin share? Only such an account may
// preview the operator view; a real operator account never sees the option.
function hasManagementAccess(userRole: string | undefined, allSystems: System[]): boolean {
  if (userRole === 'admin') return true
  return allSystems.some((s) => isOwnedSystem(s) || (!!s.shared_permission && s.shared_permission !== 'view' && s.shared_permission !== 'operator'))
}

type OperatorModeState = {
  isRealOperator: boolean
  canToggle: boolean
  viewAsOperator: boolean
  setViewAsOperator: (on: boolean) => void
  isOperatorView: boolean
}

const OperatorModeContext = createContext<OperatorModeState | null>(null)

// Single source of truth for "is this session showing the restricted operator
// UI right now" — either a real operator-level share on the active system, or
// an owner/admin who's toggled "View as operator" to preview it. The toggle is
// a client-only render mode: it never changes what the account can actually do
// server-side, and it's unavailable to a real operator account (nothing to
// escalate to, and the control itself isn't offered).
//
// Lives in a Provider (mounted once, around AppShell) rather than being
// recomputed by each caller — AppShell's nav chrome and the routed "/" page
// (which picks Dashboard vs. OperatorHome) both need to react to the SAME
// toggle instantly. Two independent hook instances, each seeding its own
// useState from localStorage only at mount, previously meant flipping the
// toggle updated the nav immediately but left an already-mounted page
// showing the wrong content until an unrelated navigation remounted it.
export function OperatorModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { activeSystem, allSystems, isLoading } = useSystems()
  const [stored, setStored] = useState(() => {
    try { return localStorage.getItem(VIEW_AS_KEY) === '1' } catch { return false }
  })

  const isRealOperator = isRealOperatorSystem(activeSystem)
  const canToggle = hasManagementAccess(user?.userRole, allSystems) && !isRealOperator

  const setViewAsOperator = useCallback((on: boolean) => {
    const next = on && canToggle
    setStored(next)
    try { localStorage.setItem(VIEW_AS_KEY, next ? '1' : '0') } catch { /* ignore */ }
  }, [canToggle])

  // A stale toggle from a different account/system should never silently grant
  // the operator view somewhere it doesn't apply — but wait for systems data to
  // actually load first. allSystems is briefly empty on mount/reload, which
  // would otherwise make canToggle false for a moment and permanently wipe a
  // valid persisted "on" straight after a refresh.
  useEffect(() => {
    if (!isLoading && stored && !canToggle) setStored(false)
  }, [stored, canToggle, isLoading])

  const viewAsOperator = canToggle && stored
  const value = useMemo(
    () => ({ isRealOperator, canToggle, viewAsOperator, setViewAsOperator, isOperatorView: isRealOperator || viewAsOperator }),
    [isRealOperator, canToggle, viewAsOperator, setViewAsOperator],
  )

  return createElement(OperatorModeContext.Provider, { value }, children)
}

export function useOperatorMode(): OperatorModeState {
  const ctx = useContext(OperatorModeContext)
  if (!ctx) throw new Error('useOperatorMode must be used within OperatorModeProvider')
  return ctx
}
