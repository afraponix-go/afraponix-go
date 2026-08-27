import './legal.css'

export const PRIVACY_EFFECTIVE = '22 August 2026'

// A plain-language privacy policy describing what Afraponix Go collects and why.
// Review with your own counsel before relying on it for compliance.
export function PrivacyContent() {
  return (
    <div className="terms-body">
      <p className="terms-eff">Effective {PRIVACY_EFFECTIVE}</p>

      <h3>1. Who we are</h3>
      <p>
        Afraponix Go ("we", "us", the "app") is an aquaponics and hydroponics management tool operated by
        Afraponix. This policy explains what personal information we collect, how we use it, and the
        choices you have. Questions? Email <a href="mailto:justin@afraponix.com">justin@afraponix.com</a>.
      </p>

      <h3>2. Information we collect</h3>
      <p>
        <b>Account details</b> — when you create an account we collect your name and email address, and a
        securely hashed password. If you sign in with Google, we receive your name, email address and
        Google account identifier from Google (we never see your Google password).
      </p>
      <p>
        <b>Your farm data</b> — the information you enter to run your systems: water-quality and nutrient
        readings, fish and plant records, grow-bed and tank configurations, dosing and spray programmes,
        harvests and related notes.
      </p>
      <p>
        <b>Technical data</b> — a session token stored in your browser to keep you signed in, and basic
        server logs (such as request times and error information) used to operate and secure the service.
      </p>

      <h3>3. How we use your information</h3>
      <p>
        We use your information to provide the app and its features, authenticate you, keep your account
        secure, send account emails (such as email verification and password resets), and maintain, debug
        and improve the service. We do <b>not</b> sell your personal information, and we do not use your
        farm data for advertising.
      </p>

      <h3>4. Service providers</h3>
      <p>
        We share limited data with providers that help us run the app: <b>Google</b> (for "Sign in with
        Google", if you use it) and an <b>email delivery provider</b> (to send verification and
        password-reset emails). These providers process data on our behalf and only as needed to provide
        their service. Data is stored on our managed database server.
      </p>

      <h3>5. Data sharing between users</h3>
      <p>
        If you share a farm with another user, the people you invite can see and, depending on the access
        level you grant, edit that farm's data. You control these invitations from within the app.
      </p>

      <h3>6. Data retention and deletion</h3>
      <p>
        We keep your information for as long as your account is active. You can delete a system and its
        data from within the app. To delete your entire account and associated data, contact us at
        <a href="mailto:justin@afraponix.com"> justin@afraponix.com</a> and we will action your request.
      </p>

      <h3>7. Security</h3>
      <p>
        We take reasonable measures to protect your information, including hashed passwords, encrypted
        connections (HTTPS) and access controls. No system is perfectly secure, so we cannot guarantee
        absolute security.
      </p>

      <h3>8. Your rights</h3>
      <p>
        You may request access to, correction of, or deletion of your personal information, and you can
        update your name and password from your account settings at any time. To exercise other rights,
        contact us using the email above.
      </p>

      <h3>9. Children</h3>
      <p>
        The app is intended for use by adults and is not directed at children under 16. We do not
        knowingly collect personal information from children.
      </p>

      <h3>10. Changes to this policy</h3>
      <p>
        We may update this policy from time to time. The effective date above reflects the latest
        version; material changes will be reflected here.
      </p>
    </div>
  )
}
