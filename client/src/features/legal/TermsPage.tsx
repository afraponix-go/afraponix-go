import { Link } from 'react-router-dom'
import { Brand } from '../../components/Brand'
import { TermsContent } from './terms'
import './legal.css'

export function TermsPage() {
  return (
    <div className="terms-page">
      <Link to="/welcome" aria-label="Afraponix Go home"><Brand size={30} /></Link>
      <h1 style={{ marginTop: 18 }}>Terms of Use</h1>
      <TermsContent />
      <p style={{ marginTop: 24 }}><Link to="/welcome">← Back</Link></p>
    </div>
  )
}
