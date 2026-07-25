import { useEffect, useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { updateProfile, changePassword } from '../auth/api'
import { ApiError } from '../../lib/apiClient'
import '../fish/fish.css'
import '../dashboard/dashboard.css'
import './settings.css'

export function AccountSettings() {
  const { user, setUser } = useAuth()

  // Profile form
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  // Password form
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pwSaved, setPwSaved] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)

  useEffect(() => {
    setFirstName(user?.firstName ?? '')
    setLastName(user?.lastName ?? '')
  }, [user])

  const profileMut = useMutation({
    mutationFn: () => updateProfile(firstName, lastName),
    onSuccess: (u) => {
      setUser(u)
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2500)
    },
    onError: (e) => setProfileError(e instanceof ApiError ? e.message : 'Could not save your profile.'),
  })

  const passwordMut = useMutation({
    mutationFn: () => changePassword(current, next),
    onSuccess: () => {
      setPwSaved(true)
      setCurrent('')
      setNext('')
      setConfirm('')
      setTimeout(() => setPwSaved(false), 2500)
    },
    onError: (e) => setPwError(e instanceof ApiError ? e.message : 'Could not change your password.'),
  })

  function onSaveProfile(e: FormEvent) {
    e.preventDefault()
    setProfileError(null)
    if (!firstName.trim() || !lastName.trim()) return setProfileError('Enter your first and last name.')
    profileMut.mutate()
  }

  function onChangePassword(e: FormEvent) {
    e.preventDefault()
    setPwError(null)
    if (next.length < 8) return setPwError('New password must be at least 8 characters.')
    if (next !== confirm) return setPwError('New passwords do not match.')
    passwordMut.mutate()
  }

  if (!user) return <div className="empty">Loading your account…</div>

  return (
    <div>
      <div className="set-card">
        <h2 className="set-title">Profile</h2>
        <p className="set-sub">Your name is shown across the app. You sign in with <b>{user.email}</b>.</p>

        <form className="mform" onSubmit={onSaveProfile}>
          {profileError && <div className="set-error">{profileError}</div>}
          {profileSaved && <div className="set-ok">Saved ✓</div>}
          <div className="row-2">
            <div className="field">
              <label htmlFor="acc-first">First name</label>
              <input id="acc-first" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="acc-last">Last name</label>
              <input id="acc-last" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="mform-actions">
            <button className="btn" type="submit" disabled={profileMut.isPending}>
              {profileMut.isPending ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>
      </div>

      <div className="set-card">
        <h2 className="set-title">Password</h2>
        <p className="set-sub">Choose a strong password of at least 8 characters.</p>

        <form className="mform" onSubmit={onChangePassword}>
          {pwError && <div className="set-error">{pwError}</div>}
          {pwSaved && <div className="set-ok">Password updated ✓</div>}
          <div className="field">
            <label htmlFor="acc-current">Current password</label>
            <input id="acc-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div className="row-2">
            <div className="field">
              <label htmlFor="acc-new">New password</label>
              <input id="acc-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="acc-confirm">Confirm new password</label>
              <input id="acc-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
          </div>
          <div className="mform-actions">
            <button className="btn" type="submit" disabled={passwordMut.isPending}>
              {passwordMut.isPending ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
