import Link from "next/link";
import {
  ArrowRight,
  Palette,
  Sparkles,
  Search,
  Download,
  ShieldCheck,
  Users,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Palette,
    title: "Brand Engine",
    description:
      "Save your voice, positioning, and target customer once. Every listing ListingStudio writes flows through that profile, so nothing ever sounds off-brand or generic.",
  },
  {
    icon: Sparkles,
    title: "AI listing generator",
    description:
      "Titles, descriptions, tags, taxonomy, and pricing guidance generated together from your product details and brand profile in under a minute.",
  },
  {
    icon: ShieldCheck,
    title: "Honest about assumptions",
    description:
      "When the AI has to assume something it doesn't know — like a material or care instruction — it tells you, instead of quietly inventing facts about your product.",
  },
  {
    icon: Search,
    title: "Searchable listing library",
    description:
      "Every generated listing lives in one place. Filter by status, search by title or product, and pick up exactly where you left off.",
  },
  {
    icon: Download,
    title: "Export anywhere",
    description:
      "Pull your listings out as CSV or JSON whenever you need them — for your own records, a spreadsheet workflow, or another tool.",
  },
  {
    icon: Users,
    title: "Built for teams",
    description:
      "Every workspace is fully isolated. Invite teammates to the same brand and listing library without ever mixing data between shops.",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Build your Brand Profile",
    description:
      "Answer a few questions about your shop — or let the AI Brand Builder draft a profile for you — covering voice, positioning, and your ideal customer.",
  },
  {
    number: "02",
    title: "Generate a listing",
    description:
      "Describe a product once. ListingStudio writes the title, description, tags, pricing guidance, and social captions in your brand's voice.",
  },
  {
    number: "03",
    title: "Refine and export",
    description:
      "Regenerate any section with a quick instruction, then export the listing whenever you're ready to publish it on Etsy.",
  },
];

export default function Home() {
  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <span className="text-base font-semibold tracking-tight text-foreground">
            ListingStudio
          </span>
          <nav className="hidden items-center gap-8 sm:flex">
            <a href="#brand-engine" className="text-sm font-medium text-muted hover:text-foreground">
              Brand Engine
            </a>
            <a href="#features" className="text-sm font-medium text-muted hover:text-foreground">
              Features
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-muted hover:text-foreground">
              How it works
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/auth/sign-in" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Sign in
            </Link>
            <Link href="/auth/sign-up" className={buttonVariants({ size: "sm" })}>
              Start free
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-6 pb-20 pt-20 text-center sm:pt-28">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            AI-powered Etsy listings
          </span>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Etsy listings that finally sound like your brand.
          </h1>
          <p className="max-w-xl text-lg text-muted">
            ListingStudio&apos;s Brand Engine turns one saved brand profile into on-brand, SEO-ready
            titles, descriptions, tags, and captions — for every product you sell.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/auth/sign-up" className={buttonVariants({ size: "lg" })}>
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/auth/sign-in" className={buttonVariants({ variant: "secondary", size: "lg" })}>
              Sign in
            </Link>
          </div>

          <div className="mt-8 w-full max-w-3xl">
            <Card className="overflow-hidden text-left">
              <div className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                <div className="flex flex-col gap-3 p-6">
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-muted-surface px-2.5 py-1 text-xs font-medium text-muted">
                    <Palette className="h-3.5 w-3.5" aria-hidden="true" />
                    Brand Profile
                  </span>
                  <p className="text-sm font-medium text-foreground">Warm, handmade, a little playful</p>
                  <p className="text-sm text-muted">
                    Voice, positioning, and target customer — saved once, reused everywhere.
                  </p>
                </div>
                <div className="flex flex-col gap-3 bg-accent-soft/40 p-6">
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    Generated listing
                  </span>
                  <p className="text-sm font-medium text-foreground">
                    &ldquo;Speckled Stoneware Mug — Handthrown, Warm-Glazed Coffee Mug for Cozy Mornings&rdquo;
                  </p>
                  <p className="text-sm text-muted">Title, description, tags, and pricing guidance — all on brand.</p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section id="brand-engine" className="border-y border-border bg-surface">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-20 sm:grid-cols-2 sm:items-center">
            <div className="flex flex-col gap-4">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                The flagship difference
              </span>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                Generic AI tools forget your brand. ListingStudio never does.
              </h2>
              <p className="text-base text-muted">
                Most AI listing tools generate copy from a product description alone, which means
                every shop ends up sounding the same. ListingStudio starts from your Brand
                Profile — your voice, your positioning, your customer — so every piece of
                generated content stays consistent, no matter who on your team is writing it.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              {[
                "Set your voice and positioning once during onboarding.",
                "Every listing, regeneration, and caption pulls from that same profile.",
                "Update your brand profile and future listings pick it up immediately.",
              ].map((line) => (
                <div key={line} className="flex items-start gap-3 rounded-lg border border-border bg-background p-4">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  <p className="text-sm text-foreground">{line}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto w-full max-w-6xl px-6 py-20">
          <div className="mx-auto mb-12 max-w-xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              Everything you need to list with confidence
            </h2>
            <p className="mt-3 text-base text-muted">
              Built for sellers who want speed without losing the voice that makes their shop theirs.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <Card key={feature.title} className="p-6">
                <feature.icon className="h-8 w-8 text-accent" aria-hidden="true" />
                <h3 className="mt-4 text-base font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted">{feature.description}</p>
              </Card>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="border-y border-border bg-surface">
          <div className="mx-auto w-full max-w-6xl px-6 py-20">
            <div className="mx-auto mb-12 max-w-xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">How it works</h2>
              <p className="mt-3 text-base text-muted">From brand profile to publish-ready listing in three steps.</p>
            </div>
            <div className="grid gap-8 sm:grid-cols-3">
              {STEPS.map((step) => (
                <div key={step.number} className="flex flex-col gap-3">
                  <span className="text-sm font-semibold text-accent">{step.number}</span>
                  <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                  <p className="text-sm text-muted">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 py-20">
          <Card className="flex flex-col items-center gap-6 px-6 py-16 text-center">
            <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-foreground">
              Ready to write listings that actually sound like you?
            </h2>
            <p className="max-w-md text-base text-muted">
              Create your Brand Profile and generate your first listing in a few minutes — free.
            </p>
            <Link href="/auth/sign-up" className={buttonVariants({ size: "lg" })}>
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <span className="text-sm font-medium text-foreground">ListingStudio</span>
          <p className="text-sm text-muted">&copy; {year} ListingStudio. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
