import { Link } from 'react-router-dom'
import { Brand } from '../../components/Brand'
import './landing.css'

const FEATURES = [
  {
    title: 'Automatic Sensor Configuration',
    body: 'Real-time monitoring of pH, temperature and nutrient sensors, with alerts when a reading drifts out of its healthy range.',
  },
  {
    title: 'Plant Batch Management',
    body: 'Track grow cycles, varieties and harvest schedules per bed, from seedling through to recorded harvest weight.',
  },
  {
    title: 'Fish Batch Management',
    body: 'Monitor stocking density, feeding and mortality across every tank, with biomass and density tracked over time.',
  },
  {
    title: 'Spray Programme Automation',
    body: 'Plan nutrient and pest-control applications on a schedule, with a record of what was applied, where and when.',
  },
  {
    title: 'Data Analytics & Trending',
    body: 'Dashboards and charts for every water-quality parameter, so you can see trends instead of isolated readings.',
  },
  {
    title: 'Complete Ecosystem Management',
    body: 'Fish, plants and water quality in one system — nutrient cycling and water balance managed together, not separately.',
  },
]

const BENEFITS = [
  { value: '90%', label: 'Resource Efficiency', body: 'Optimal water and nutrient utilisation' },
  { value: '80%', label: 'Labour Reduction', body: 'Automated monitoring and management' },
  { value: '70%', label: 'Faster Growth', body: 'Optimised growing conditions' },
]

export function LandingPage() {
  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-nav-inner">
          <Brand size={28} />
          <nav className="lp-nav-actions">
            <Link className="lp-btn ghost" to="/login">Sign in</Link>
            <Link className="lp-btn primary" to="/register">Get started</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-hero-text">
            <span className="lp-eyebrow">Aquaponics management</span>
            <h1>
              Intelligent Aquaponics
              <span className="accent"> Management</span>
            </h1>
            <p className="lp-lede">
              Run your operation on real numbers: monitor water quality, fish and plants in one place,
              and turn daily readings into decisions.
            </p>
            <div className="lp-hero-cta">
              <Link className="lp-btn primary lg" to="/register">Create your account</Link>
              <Link className="lp-btn ghost lg" to="/login">Sign in</Link>
            </div>
            <ul className="lp-stats">
              <li><b>24/7</b><span>Real-time monitoring</span></li>
              <li><b>5 min</b><span>Setup time</span></li>
              <li><b>Auto</b><span>Smart alerts</span></li>
            </ul>
          </div>

          {/* Illustrative preview of the dashboard, not live data */}
          <div className="lp-preview" aria-hidden>
            <div className="lp-preview-head">
              <span>Live Dashboard</span>
              <span className="lp-dot">Online</span>
            </div>
            <div className="lp-preview-grid">
              <div><span>Water temp</span><b>24.5 °C</b></div>
              <div><span>pH level</span><b>6.8</b></div>
              <div><span>Fish count</span><b>1,247</b></div>
              <div><span>Harvest ready</span><b>89</b></div>
            </div>
            <svg className="lp-spark" viewBox="0 0 300 80" preserveAspectRatio="none">
              <path
                d="M10,60 Q50,30 90,45 T170,35 Q210,25 250,40 T290,30 L290,80 L10,80 Z"
                fill="var(--accent)" opacity="0.12"
              />
              <path
                d="M10,60 Q50,30 90,45 T170,35 Q210,25 250,40 T290,30"
                stroke="var(--accent)" strokeWidth="2" fill="none"
              />
            </svg>
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-section-head">
            <span className="lp-eyebrow">What it does</span>
            <h2>Everything you need to run an aquaponics operation</h2>
            <p>From daily water tests to harvest records — one system instead of a spreadsheet per job.</p>
          </div>
          <div className="lp-features">
            {FEATURES.map((f) => (
              <article className="lp-card" key={f.title}>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-section alt">
          <div className="lp-section-head">
            <span className="lp-eyebrow">The numbers</span>
            <h2>Maximise your agricultural ROI</h2>
            <p>What a well-managed, well-measured system makes possible.</p>
          </div>
          <div className="lp-benefits">
            {BENEFITS.map((b) => (
              <div className="lp-benefit" key={b.label}>
                <b>{b.value}</b>
                <span className="lp-benefit-label">{b.label}</span>
                <span className="lp-benefit-body">{b.body}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="lp-final">
          <h2>Ready to get your system on the numbers?</h2>
          <p>Create an account and set up your first system in a few minutes.</p>
          <div className="lp-hero-cta center">
            <Link className="lp-btn primary lg" to="/register">Create your account</Link>
            <Link className="lp-btn ghost lg" to="/login">Sign in</Link>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <span>© {new Date().getFullYear()} Afraponix</span>
      </footer>
    </div>
  )
}
