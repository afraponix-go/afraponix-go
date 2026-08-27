import { Link } from 'react-router-dom'
import { Brand } from '../../components/Brand'
import { PrivacyContent } from './privacy'
import './legal.css'

export function PrivacyPage() {
  return (
    <div className="terms-page">
      <Link to="/welcome" aria-label="Afraponix Go home"><Brand size={30} /></Link>
      <h1 style={{ marginTop: 18 }}>Privacy Policy</h1>
      <PrivacyContent />
      <p style={{ marginTop: 24 }}><Link to="/welcome">← Back</Link></p>
    </div>
  )
}
