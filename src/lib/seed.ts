import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { workspaces } from "@/db/schema";
import { ingestSource } from "@/lib/sources";

type SeedSource = {
  type: "seed";
  title: string;
  origin: { channel?: string; author?: string; filename?: string };
  content: string;
};

// A fictional B2B SaaS ("Northwind") whose operational knowledge is scattered
// across a handbook, Slack threads, and support tickets — with one deliberate
// contradiction (refund window: handbook says 30 days, Slack says 45) so the
// extractor's conflict detection has something real to find.
const SEED_SOURCES: SeedSource[] = [
  {
    type: "seed",
    title: "Support Handbook — Refunds",
    origin: { filename: "support-handbook.md" },
    content: `# Northwind Support Handbook

## Refunds

Customers can request a refund on any paid plan. Our standard refund window is 30 days from the invoice date.

- If the request is within 30 days of the invoice, issue a full refund in Stripe immediately.
- If the request is between 31 and 60 days, it requires manager approval before issuing.
- If the request is more than 60 days after the invoice, we do not issue cash refunds. Offer account credit only.

Never issue a refund greater than $2,000 without VP of Finance sign-off, regardless of the window.

Always confirm the refund by email to the customer, stating the amount and that it takes 5-10 business days to appear.

For annual plans cancelled mid-term, refund the unused months on a pro-rated basis.`,
  },
  {
    type: "seed",
    title: "#support-policy — refund edge cases",
    origin: { channel: "#support-policy", author: "Dana (Support Lead)" },
    content: `Dana (Support Lead): hey team, quick clarification on refunds since it came up again
Dana: we've actually been honoring refunds up to 45 days now, not 30 — leadership approved that last quarter for goodwill
Marco: good to know, the handbook still says 30
Dana: yeah the handbook is stale, I'll get it updated. use 45 days as the automatic window
Dana: anything over 45 still needs my approval
Priya: what about customers who hit a bug and want money back?
Dana: if it's a confirmed defect/outage on our side, refund it regardless of the window. log the incident id in the refund note
Priya: got it. and disputed charges / chargebacks?
Dana: never refund a charge that already has an open chargeback — the bank handles it, refunding on top double-pays. escalate those to finance`,
  },
  {
    type: "seed",
    title: "Pricing Exceptions Policy",
    origin: { filename: "pricing-exceptions.md" },
    content: `# Pricing Exceptions

Sales reps may offer discounts within these limits without approval:
- Up to 15% off list on annual contracts.
- Up to 10% off list on monthly contracts.

Anything beyond those thresholds requires Director of Sales approval, recorded in the CRM opportunity notes.

Nonprofit and education customers get a standard 30% discount — no approval needed, but verify eligibility with a .org/.edu domain or 501(c)(3) documentation.

Never discount below our floor price of $12 per seat per month. If a deal requires going below the floor, it must go to the VP of Sales and Finance jointly.

Multi-year prepay (2+ years upfront) can receive up to 25% off with Director approval.`,
  },
  {
    type: "seed",
    title: "Incident Response Runbook",
    origin: { filename: "incident-runbook.md" },
    content: `# Incident Response

When an alert fires or a customer reports an outage:

1. The on-call engineer acknowledges the page within 5 minutes.
2. Open an incident channel named #inc-YYYYMMDD-short-name and post the current impact.
3. Declare a severity: SEV1 (full outage / data risk), SEV2 (major feature down), SEV3 (degraded / minor).
4. For SEV1, page the incident commander and notify the CTO immediately.
5. Post status updates every 30 minutes to the incident channel and to status.northwind.com.
6. Once mitigated, mark the incident resolved and schedule a blameless postmortem within 3 business days.

Do not communicate root cause externally until the postmortem confirms it. Customer comms go through the support lead, never directly from engineering.`,
  },
  {
    type: "seed",
    title: "#eng-oncall — sev triage thread",
    origin: { channel: "#eng-oncall", author: "Sam (SRE)" },
    content: `Sam (SRE): reminder on sev levels since we mislabeled the last one
Sam: if customer data could be exposed or lost, that's ALWAYS a SEV1 even if only one customer is affected
Sam: partial outage of a paid feature = SEV2
Sam: if it's just slow but working, SEV3
Jordan: what about the billing system being down?
Sam: billing down is SEV1 — it's revenue impacting and data-sensitive
Jordan: and who declares the incident commander for SEV1?
Sam: on-call declares, then hands off to whoever is the designated IC that week (rotation in the oncall doc)`,
  },
  {
    type: "seed",
    title: "Ticket #4821 — onboarding a new enterprise customer",
    origin: { filename: "ticket-4821.txt" },
    content: `Subject: Enterprise onboarding steps

Internal notes from onboarding Globex (enterprise, 400 seats):

Our standard enterprise onboarding:
1. Kickoff call within 2 business days of contract signature.
2. Provision the org in the admin console and set the seat count from the contract.
3. Enable SSO (SAML) — collect the customer's IdP metadata; we support Okta, Azure AD, and Google.
4. Import their users via CSV or SCIM.
5. Schedule a 60-minute admin training and a 30-minute end-user webinar.
6. Assign a Customer Success Manager for accounts over 100 seats.
7. Set a 30-day check-in and a 90-day business review.

For accounts over 250 seats, the CSM must be a senior CSM and finance sets up custom invoicing (NET-30 terms, PO required).`,
  },
];

export async function seedSampleCompany(input: {
  workspaceId: string;
  createdBy: string;
}) {
  const db = getDb();
  const [ws] = await db
    .select({ sampleSeeded: workspaces.sampleSeeded })
    .from(workspaces)
    .where(eq(workspaces.id, input.workspaceId))
    .limit(1);
  if (ws?.sampleSeeded) {
    return { alreadySeeded: true, created: 0 };
  }

  let created = 0;
  for (const source of SEED_SOURCES) {
    const result = await ingestSource({
      workspaceId: input.workspaceId,
      createdBy: input.createdBy,
      type: "seed",
      title: source.title,
      content: source.content,
      origin: source.origin,
    });
    if (!result.deduped) created += 1;
  }

  await db
    .update(workspaces)
    .set({ sampleSeeded: true, updatedAt: new Date() })
    .where(eq(workspaces.id, input.workspaceId));

  return { alreadySeeded: false, created };
}
