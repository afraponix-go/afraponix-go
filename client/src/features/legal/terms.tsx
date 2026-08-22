import './legal.css'

// Bump this when the terms change — every user is re-prompted to accept a version
// they haven't accepted yet.
export const TERMS_VERSION = '2026-08-22'
export const TERMS_EFFECTIVE = '22 August 2026'

export function TermsContent() {
  return (
    <div className="terms-body">
      <p className="terms-eff">Effective {TERMS_EFFECTIVE}</p>

      <h3>1. Acceptance</h3>
      <p>
        By creating an account or using Afraponix Go (the "app"), you agree to these Terms of Use. If
        you do not agree, please do not use the app.
      </p>

      <h3>2. A guide, not professional advice</h3>
      <p>
        Afraponix Go provides tools, calculators, targets and recommendations to help you manage
        aquaponic and hydroponic systems. All figures, targets, dosing amounts and other outputs are
        <b> general guidance only</b>. They are not a substitute for your own judgement or for
        professional agronomic, veterinary, engineering or safety advice.
      </p>

      <h3>3. Accuracy and your responsibility</h3>
      <p>
        Every system is different, and the inputs, sensor readings and reference data the app relies
        on can be incomplete or incorrect. <b>Mistakes can happen.</b> You are responsible for checking
        any recommendation before acting on it. Always <b>exercise caution</b>: make small, conservative
        changes, cross-check calculations, and confirm nutrient, chemical and dosing amounts against
        product labels and independent sources before applying them to a live system.
      </p>

      <h3>4. No warranty</h3>
      <p>
        The app is provided "as is" and "as available", without warranties of any kind, whether express
        or implied, including as to accuracy, reliability, fitness for a particular purpose or
        uninterrupted availability.
      </p>

      <h3>5. Limitation of liability</h3>
      <p>
        To the fullest extent permitted by law, <b>Afraponix and its team accept no liability</b> for any
        loss or damage of any kind arising from your use of, or reliance on, the app or its
        recommendations — including, without limitation, loss of fish, plants or crops, equipment damage,
        water-quality problems, business or financial loss, or any direct, indirect, incidental or
        consequential damages. You use the app, and act on its outputs, entirely at your own risk.
      </p>

      <h3>6. Safety</h3>
      <p>
        Handling fertilisers, chemicals and equipment carries risks. Follow all product safety
        instructions and applicable regulations. Afraponix Go does not assess or guarantee the safety of
        any action you choose to take.
      </p>

      <h3>7. Changes</h3>
      <p>
        We may update the app and these terms from time to time. If the terms change we will ask you to
        accept the new version; continued use after a change means you accept the updated terms.
      </p>
    </div>
  )
}
