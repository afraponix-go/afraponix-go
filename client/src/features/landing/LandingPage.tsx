import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Brand } from '../../components/Brand'
import './landing.css'

const FEATURES = [
  {
    title: 'Water quality & KH tracking',
    body: 'Log pH, KH/alkalinity, dissolved oxygen, temperature, ammonia, nitrite and the full nutrient panel. Every reading is scored against a healthy band with an at-a-glance pill.',
  },
  {
    title: 'Nutrient dosing calculator',
    body: 'Dose your reservoir to a crop’s targets. It sizes each fertiliser to hit the levels with the least overshoot, spreads big corrections over safe weekly steps, and lays out a mix-by-day plan you can follow.',
  },
  {
    title: 'pH & alkalinity dosing',
    body: 'Pull your current pH and KH, pick an acid or base, and get the amount to reach target — scaled to your water’s alkalinity, crediting any nutrients the buffer also adds.',
  },
  {
    title: 'Operations calendar',
    body: 'Spray, dosing and routine tasks share one calendar and logbook. Build recurring programmes and record what was done, where and when — with efficacy tracked before and after.',
  },
  {
    title: 'Plants, seedlings & harvest',
    body: 'Track grow cycles per bed from nursery germination through transplant to recorded harvest weight, with per-crop nutrient targets and plant spacing.',
  },
  {
    title: 'Fish & tank management',
    body: 'Monitor stocking density, feeding, growth and mortality across every tank, with biomass and density tracked over time against a safe maximum.',
  },
]

const BENEFITS = [
  { value: '90%', label: 'Resource efficiency', body: 'Optimal water and nutrient utilisation' },
  { value: '80%', label: 'Less manual work', body: 'Guided dosing and one-place records' },
  { value: '70%', label: 'Faster growth', body: 'Levels kept in the crop’s target band' },
]

// A small browser-window frame around a UI mockup (illustrative, not live data).
function Shot({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="lp-shot" aria-hidden>
      <div className="lp-shot-bar">
        <span className="lp-shot-dots"><i /><i /><i /></span>
        <span className="lp-shot-title">{title}</span>
      </div>
      <div className="lp-shot-body">{children}</div>
    </div>
  )
}

const WATER_TILES = [
  { label: 'Water temp', value: '24.3', unit: '°C', ok: true },
  { label: 'pH', value: '7.25', unit: '', ok: true },
  { label: 'KH', value: '6.1', unit: 'dKH', ok: true },
  { label: 'Dissolved O₂', value: '7.2', unit: 'mg/L', ok: true },
  { label: 'Ammonia', value: '0.22', unit: 'ppm', ok: true },
  { label: 'Nitrate', value: '64', unit: 'ppm', ok: true },
]

const MIXES = [
  { mix: 'Mix A · Calcium', day: 'Day 1', items: [['Calcium Nitrate', '7.19 kg']] },
  { mix: 'Mix B · Potassium / Phosphorus', day: 'Day 3', items: [['GH Shiman 2-1-2', '1.53 kg']] },
  { mix: 'Mix C · Micronutrients', day: 'Day 5', items: [['Iron Micromix', '636 g'], ['Magnesium Sulphate', '4.96 kg']] },
]

const CAL_DAYS = [
  { d: 'Mon', chips: [{ t: 'Dose N', k: 'dose' }] },
  { d: 'Tue', chips: [] },
  { d: 'Wed', chips: [{ t: 'Neem spray', k: 'spray' }] },
  { d: 'Thu', chips: [{ t: 'Dose K', k: 'dose' }] },
  { d: 'Fri', chips: [{ t: 'Feed fish', k: 'task' }] },
  { d: 'Sat', chips: [{ t: 'Dose micros', k: 'dose' }] },
  { d: 'Sun', chips: [] },
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
              Run your farm on
              <span className="accent"> real numbers</span>
            </h1>
            <p className="lp-lede">
              Water quality, dosing, spray and operations programmes, plants and fish — one place that turns
              daily readings into the exact next action.
            </p>
            <div className="lp-hero-cta">
              <Link className="lp-btn primary lg" to="/register">Create your account</Link>
              <Link className="lp-btn ghost lg" to="/login">Sign in</Link>
            </div>
            <ul className="lp-stats">
              <li><b>7</b><span>Water parameters tracked</span></li>
              <li><b>3</b><span>Programme types, one calendar</span></li>
              <li><b>5 min</b><span>To your first system</span></li>
            </ul>
          </div>

          {/* Illustrative dashboard preview, not live data */}
          <div className="lp-preview" aria-hidden>
            <div className="lp-preview-head">
              <span>Water quality</span>
              <span className="lp-dot">Live</span>
            </div>
            <div className="lp-preview-grid">
              {WATER_TILES.slice(0, 4).map((t) => (
                <div key={t.label}>
                  <span>{t.label}</span>
                  <b>{t.value}{t.unit ? <em> {t.unit}</em> : null}</b>
                  <i className="lp-pill">In range</i>
                </div>
              ))}
            </div>
            <svg className="lp-spark" viewBox="0 0 300 80" preserveAspectRatio="none">
              <path d="M10,60 Q50,30 90,45 T170,35 Q210,25 250,40 T290,30 L290,80 L10,80 Z" fill="var(--accent)" opacity="0.12" />
              <path d="M10,60 Q50,30 90,45 T170,35 Q210,25 250,40 T290,30" stroke="var(--accent)" strokeWidth="2" fill="none" />
            </svg>
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-section-head">
            <span className="lp-eyebrow">What it does</span>
            <h2>Everything you need to run the whole system</h2>
            <p>From daily water tests to a mix-by-day dosing plan — one tool instead of a spreadsheet per job.</p>
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
            <span className="lp-eyebrow">See it in action</span>
            <h2>Readings in, decisions out</h2>
            <p>The screens you’ll live in — built around the daily loop of test, dose, record.</p>
          </div>

          <div className="lp-showcase">
            <div className="lp-show-row">
              <div className="lp-show-text">
                <h3>Every parameter, scored at a glance</h3>
                <p>
                  Log pH, KH, dissolved oxygen, temperature and the full nutrient panel. Each tile shows the
                  latest value against its healthy band, and opens a history chart so you see trends, not
                  isolated numbers.
                </p>
              </div>
              <Shot title="Dashboard — Water quality">
                <div className="lp-tilegrid">
                  {WATER_TILES.map((t) => (
                    <div className="lp-tile" key={t.label}>
                      <span className="lp-tile-l">{t.label}</span>
                      <b className="lp-tile-v">{t.value}<em> {t.unit}</em></b>
                      <i className="lp-pill">In range</i>
                    </div>
                  ))}
                </div>
              </Shot>
            </div>

            <div className="lp-show-row reverse">
              <div className="lp-show-text">
                <h3>A dosing plan, not a pile of numbers</h3>
                <p>
                  Enter your volume and crop; the calculator sizes each fertiliser to hit the targets with the
                  least overshoot, corrects pH scaled to your alkalinity, and spells out which mix to add on
                  which day — flagging anything it can’t reach cleanly.
                </p>
              </div>
              <Shot title="Nutrient Dosing — Kale · 143,680 L">
                <div className="lp-plan">
                  <div className="lp-plan-step"><span className="lp-stepn">1</span> Correct pH — add <b>10.6 L</b> Hydrochloric Acid</div>
                  <div className="lp-plan-step2"><span className="lp-stepn">2</span> Dose nutrients — one mix per day</div>
                  {MIXES.map((m) => (
                    <div className="lp-mix" key={m.mix}>
                      <div className="lp-mix-h"><span>{m.mix}</span><i className="lp-day">{m.day}</i></div>
                      {m.items.map(([name, amt]) => (
                        <div className="lp-mix-r" key={name}><span>{name}</span><b>{amt}</b></div>
                      ))}
                    </div>
                  ))}
                  <div className="lp-warn">Nitrogen falls short — add a dedicated N source</div>
                </div>
              </Shot>
            </div>

            <div className="lp-show-row">
              <div className="lp-show-text">
                <h3>Spray, dosing and tasks on one calendar</h3>
                <p>
                  Build recurring programmes — pest sprays, nutrient dosing, feed and maintenance — that all
                  share a single calendar and logbook. Record what was applied, where and when, and track how
                  the reading moved afterwards.
                </p>
              </div>
              <Shot title="Operations — This week">
                <div className="lp-cal">
                  {CAL_DAYS.map((c) => (
                    <div className="lp-cal-d" key={c.d}>
                      <span className="lp-cal-dn">{c.d}</span>
                      {c.chips.map((ch) => <i className={`lp-chip ${ch.k}`} key={ch.t}>{ch.t}</i>)}
                    </div>
                  ))}
                </div>
                <div className="lp-cal-key">
                  <span><i className="lp-dotk dose" /> Dosing</span>
                  <span><i className="lp-dotk spray" /> Spray</span>
                  <span><i className="lp-dotk task" /> Task</span>
                </div>
              </Shot>
            </div>
          </div>
        </section>

        <section className="lp-section">
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
