import { auth } from "@clerk/nextjs/server";
import {
  ArrowRightIcon,
  BrainIcon,
  FileTextIcon,
  PlugsConnectedIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Brand } from "@/components/brand";
import { isClerkConfigured } from "@/lib/clerk-config";

export const metadata: Metadata = {
  title: "Cortex — The Company Brain",
  description:
    "Extract scattered company know-how into a living, cited map of how you work — and an executable skills file any AI agent can run.",
};

const features = [
  {
    icon: PlugsConnectedIcon,
    title: "Ingest the scatter",
    body: "Docs, Slack threads, tickets, transcripts. Cortex reads the fragments where your operational knowledge actually lives.",
  },
  {
    icon: BrainIcon,
    title: "Structure the know-how",
    body: "AI extracts procedures, decision rules, exceptions, and guardrails into a versioned map — every claim cited to its source.",
  },
  {
    icon: FileTextIcon,
    title: "Export executable skills",
    body: "One skills file any agent can load to do the work: match the situation, follow the steps, respect the guardrails.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Keep it honest",
    body: "Human-approved, conflict-flagged, staleness-tracked. No hallucinated policy — unverifiable claims are dropped.",
  },
];

export default async function HomePage() {
  const clerkConfigured = isClerkConfigured();
  if (clerkConfigured) {
    const { userId } = await auth();
    if (userId) redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-ink">
      <nav className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-6">
        <Brand />
        {clerkConfigured ? (
          <div className="flex items-center gap-3">
            <Link
              href={"/sign-in" as Route}
              className="rounded-lg px-3 py-2 text-sm text-muted-light transition hover:bg-white/5 hover:text-paper"
            >
              Sign in
            </Link>
            <Link
              href={"/sign-up" as Route}
              className="rounded-lg bg-paper px-4 py-2 text-sm font-medium text-ink transition hover:bg-white"
            >
              Start building
            </Link>
          </div>
        ) : (
          <a
            href="https://github.com/taranggoyal70/Cortex"
            className="rounded-lg bg-paper px-4 py-2 text-sm font-medium text-ink transition hover:bg-white"
          >
            View source
          </a>
        )}
      </nav>

      <section className="mx-auto max-w-[1180px] px-6 pb-16 pt-20 lg:pt-28">
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent-light">
          <BrainIcon size={14} weight="fill" />
          The missing layer for AI automation
        </p>
        <h1 className="max-w-[900px] text-5xl font-semibold leading-[1.02] tracking-[-0.055em] text-paper sm:text-6xl lg:text-7xl">
          Your company&apos;s knowledge,
          <span className="block text-muted">turned into agent skills.</span>
        </h1>
        <p className="mt-7 max-w-[640px] text-lg leading-8 text-muted-light">
          The blocker to AI automation is no longer the models — it&apos;s the
          domain knowledge scattered across people&apos;s heads, Slack, tickets,
          and docs. Cortex pulls it together into a living, cited map of how your
          company works, and exports it as an executable skills file agents can
          run safely and consistently.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          {clerkConfigured ? (
            <Link
              href={"/sign-up" as Route}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-light hover:text-ink"
            >
              Build your company brain
              <ArrowRightIcon size={16} weight="bold" />
            </Link>
          ) : (
            <a
              href="https://github.com/taranggoyal70/Cortex#local-setup"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-light hover:text-ink"
            >
              Run the full workspace
              <ArrowRightIcon size={16} weight="bold" />
            </a>
          )}
        </div>

        <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-line-strong bg-line-strong sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div key={feature.title} className="bg-surface p-6">
              <feature.icon size={22} weight="duotone" className="mb-6 text-accent-light" />
              <h2 className="text-sm font-semibold text-paper">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
