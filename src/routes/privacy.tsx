import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Notice — PassPal" },
      {
        name: "description",
        content:
          "How Pass Pal collects, uses, shares, and protects your personal data when you use PassPal.",
      },
      { property: "og:title", content: "Privacy Notice — PassPal" },
      {
        property: "og:description",
        content: "How Pass Pal handles your personal data.",
      },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <h1>Privacy Notice</h1>
        <p className="text-sm text-muted-foreground">Last updated: {new Date().getFullYear()}</p>

        <h2>1. Who we are</h2>
        <p>
          This Privacy Notice explains how <strong>Pass Pal</strong> ("Pass Pal", "PassPal", "we",
          "us", "our") handles personal data collected through the PassPal service ("Service"). For
          the personal data described in this notice, Pass Pal acts as the <em>data controller</em>.
        </p>

        <h2>2. Personal data we collect</h2>
        <ul>
          <li>
            <strong>Account data</strong> — name, email address, and login credentials you provide
            when signing up.
          </li>
          <li>
            <strong>Profile and preferences</strong> — the exam track you select, display name,
            and settings you configure.
          </li>
          <li>
            <strong>Usage and study data</strong> — questions attempted, answers given, scores,
            attempt history, and streaks that let us provide reports and personalize practice.
          </li>
          <li>
            <strong>Support communications</strong> — messages and information you send us when
            you request help.
          </li>
          <li>
            <strong>Technical data</strong> — device identifiers, browser type, IP address, and
            basic telemetry needed to operate and secure the Service.
          </li>
          <li>
            <strong>Marketing attribution</strong> — where a visit or signup came from (e.g. UTM
            parameters or referral tags), where you provide them.
          </li>
        </ul>
        <p>
          Payment card details are collected by our reseller Paddle at checkout and are not stored
          by Pass Pal.
        </p>

        <h2>3. How we use your data and legal bases</h2>
        <ul>
          <li>
            <strong>Provide the Service</strong> (creating your account, saving progress, showing
            reports) — legal basis: performance of a contract.
          </li>
          <li>
            <strong>Security and fraud prevention</strong> — legal basis: legitimate interests in
            keeping the Service safe.
          </li>
          <li>
            <strong>Improve the Service</strong> (understanding which questions and topics are
            hardest) — legal basis: legitimate interests.
          </li>
          <li>
            <strong>Customer support</strong> — legal basis: performance of a contract and
            legitimate interests.
          </li>
          <li>
            <strong>Marketing communications</strong> (only where you opt in or where permitted by
            law) — legal basis: consent or legitimate interests.
          </li>
          <li>
            <strong>Legal compliance</strong> (record-keeping, responding to lawful requests) —
            legal basis: legal obligation.
          </li>
        </ul>

        <h2>4. Who we share your data with</h2>
        <ul>
          <li>
            <strong>Service providers and subprocessors</strong> we use to run the Service, such
            as hosting, database, authentication, email delivery, and analytics providers, under
            appropriate data protection terms.
          </li>
          <li>
            <strong>Paddle.com</strong>, our Merchant of Record, for the sale of the Service,
            payment processing, tax compliance, invoicing, and handling refunds. See Paddle's{" "}
            <a
              href="https://www.paddle.com/legal/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              privacy notice
            </a>{" "}
            for details.
          </li>
          <li>
            <strong>Professional advisers</strong> (legal, accounting) where necessary.
          </li>
          <li>
            <strong>Authorities</strong> where required by law or to protect our rights.
          </li>
        </ul>
        <p>We do not sell your personal data.</p>

        <h2>5. International transfers</h2>
        <p>
          Some of our service providers may be located outside your country. Where personal data
          is transferred internationally, we rely on appropriate safeguards such as Standard
          Contractual Clauses or applicable adequacy decisions.
        </p>

        <h2>6. Data retention</h2>
        <p>
          We keep your account and study data for as long as your account is active. If you close
          your account, we delete or anonymize your personal data within a reasonable period,
          except where we need to keep it to comply with legal, tax, or accounting obligations,
          or to resolve disputes.
        </p>

        <h2>7. Your rights</h2>
        <p>Depending on your location, you may have the right to:</p>
        <ul>
          <li>access the personal data we hold about you;</li>
          <li>correct inaccurate data;</li>
          <li>request deletion of your data;</li>
          <li>restrict or object to certain processing;</li>
          <li>request a portable copy of your data;</li>
          <li>withdraw consent where processing is based on consent;</li>
          <li>
            lodge a complaint with your local data protection authority (if you are in the UK or
            EEA).
          </li>
        </ul>
        <p>
          To exercise these rights, contact us through the app. We aim to respond within one
          month.
        </p>

        <h2>8. Security</h2>
        <p>
          We use appropriate technical and organisational measures to protect your data,
          including encryption in transit, access controls, and secure hosting. No system is
          perfectly secure, but we work continuously to protect the information you entrust to
          us.
        </p>

        <h2>9. Cookies</h2>
        <p>
          We use a small number of cookies and similar technologies that are strictly necessary
          to keep you signed in and to remember your preferences (such as your theme). If we
          later add analytics or marketing cookies, we will ask for your consent where required.
        </p>

        <h2>10. Changes to this notice</h2>
        <p>
          We may update this Privacy Notice from time to time. Material changes will be reflected
          by an updated "last updated" date and, where appropriate, additional notice within the
          Service.
        </p>

        <h2>11. Contact</h2>
        <p>
          For privacy questions or to exercise your rights, please contact Pass Pal through the
          in-app support channels.
        </p>
      </article>
    </div>
  );
}
