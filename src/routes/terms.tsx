import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — PassPal" },
      {
        name: "description",
        content: "Terms and conditions for using PassPal exam preparation services.",
      },
      { property: "og:title", content: "Terms & Conditions — PassPal" },
      {
        property: "og:description",
        content: "The terms that govern your use of PassPal.",
      },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <h1>Terms & Conditions</h1>
        <p className="text-sm text-muted-foreground">Last updated: {new Date().getFullYear()}</p>

        <h2>1. About us</h2>
        <p>
          These Terms & Conditions ("Terms") are a binding agreement between you and{" "}
          <strong>Pass Pal</strong> ("Pass Pal", "PassPal", "we", "us", "our"), the provider of
          the PassPal exam preparation service ("Service"). By creating an account or using the
          Service, you agree to these Terms.
        </p>

        <h2>2. Eligibility and account</h2>
        <p>
          You must be of legal age in your jurisdiction to enter into a contract, or have
          authority to bind the organization on whose behalf you are using the Service. You are
          responsible for keeping your account credentials confidential and for all activity that
          occurs under your account. You agree to provide accurate information and keep it up to
          date.
        </p>

        <h2>3. The Service</h2>
        <p>
          PassPal provides practice questions, diagnostic assessments, and study tools for
          licensing exams (including real estate and life & health insurance). The Service is a
          study aid and does not guarantee any particular exam outcome or licensing result.
        </p>

        <h2>4. Acceptable use</h2>
        <p>You must not misuse the Service. In particular, you agree not to:</p>
        <ul>
          <li>use the Service for any unlawful, fraudulent, or abusive purpose;</li>
          <li>send spam, phishing, or other unsolicited messages through the Service;</li>
          <li>
            infringe any intellectual property, privacy, or other rights of Pass Pal or third
            parties;
          </li>
          <li>
            attempt to interfere with the security or integrity of the Service (including probing,
            scanning, distributing malware, or scraping);
          </li>
          <li>reverse engineer, resell, or redistribute the Service or its content;</li>
          <li>circumvent access controls or usage limits.</li>
        </ul>

        <h2>5. Intellectual property</h2>
        <p>
          Pass Pal (and its licensors) owns all right, title, and interest in and to the Service,
          including all software, content, question banks, documentation, branding, and related
          intellectual property. Subject to your compliance with these Terms and payment of any
          applicable fees, we grant you a limited, non-exclusive, non-transferable right to
          access and use the Service for your own personal exam preparation.
        </p>

        <h2>6. Payments, billing, and taxes</h2>
        <p>
          Payments are processed by <strong>Stripe</strong>, our payment provider. Card details
          are collected and stored by Stripe and are never seen or stored by Pass Pal. Applicable
          taxes are calculated and collected at checkout, in accordance with the tax rules of
          your jurisdiction.
        </p>
        <p>
          Purchases are one-time payments granting access to the applicable exam pack. See our{" "}
          <a href="/refund-policy">Refund Policy</a> for information about refunds.
        </p>

        <h2>7. Service availability</h2>
        <p>
          We work to keep the Service available and functioning, but we do not guarantee that the
          Service will be uninterrupted, error-free, or free of defects. To the fullest extent
          permitted by law, the Service is provided "as is" without warranties of any kind, whether
          express or implied, including implied warranties of merchantability and fitness for a
          particular purpose.
        </p>

        <h2>8. Suspension and termination</h2>
        <p>
          We may suspend or terminate your access to the Service if you materially breach these
          Terms, fail to pay applicable fees, present a security or fraud risk, or repeatedly or
          seriously violate our policies. You may stop using the Service at any time. On
          termination, your right to access the Service ends; content you created or purchased
          may be deleted after a reasonable retention period.
        </p>

        <h2>9. Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, Pass Pal's aggregate liability arising out of or
          related to these Terms or the Service is limited to the amounts you paid to us (or to
          Paddle for our Service) in the twelve (12) months preceding the event giving rise to
          the claim. We are not liable for indirect, incidental, special, consequential, or
          punitive damages, including loss of profits, data, goodwill, or exam or licensing
          outcomes. Nothing in these Terms limits liability that cannot be limited by law
          (including fraud, death, or personal injury).
        </p>

        <h2>10. Indemnity</h2>
        <p>
          You agree to indemnify and hold Pass Pal harmless from claims arising out of your
          misuse of the Service or your violation of these Terms.
        </p>

        <h2>11. Changes</h2>
        <p>
          We may update these Terms from time to time. If we make material changes, we will notify
          you (for example, by posting the updated Terms with a new "last updated" date).
          Continued use of the Service after the update means you accept the revised Terms.
        </p>

        <h2>12. Governing law</h2>
        <p>
          These Terms are governed by the laws of the jurisdiction in which Pass Pal is
          established, without regard to conflict-of-law rules. Disputes will be brought in the
          courts of that jurisdiction, unless applicable consumer law grants you additional
          rights.
        </p>

        <h2>13. Contact</h2>
        <p>
          Questions about these Terms? Contact Pass Pal via the support channels available in the
          app or from our checkout provider Paddle at{" "}
          <a href="https://paddle.net" target="_blank" rel="noopener noreferrer">
            paddle.net
          </a>
          .
        </p>
      </article>
    </div>
  );
}
