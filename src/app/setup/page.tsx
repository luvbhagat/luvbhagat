import Link from "next/link";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

// Public diagnostics page (no login needed): shows which integrations are
// configured and which database migrations have run. Never displays secret
// values — only whether each is set.
export const dynamic = "force-dynamic";

function isSet(v: string | undefined) {
  return Boolean(v && v.trim() && !/your[-_]/i.test(v));
}

type Check = { label: string; ok: boolean; hint: string };

async function tableExists(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
) {
  // RLS may hide rows, but a missing table returns an error — that's what we
  // detect here.
  const { error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });
  return !error;
}

function Row({ ok, label, hint }: Check) {
  return (
    <li className="flex items-start gap-3">
      {ok ? (
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-400" />
      ) : (
        <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
      )}
      <div>
        <p className="text-sm font-medium">{label}</p>
        {!ok && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </li>
  );
}

export default async function SetupPage() {
  const env: Check[] = [
    {
      label: "Supabase URL + anon key",
      ok: isSet(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
        isSet(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      hint: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (Supabase → Settings → API), then restart the dev server.",
    },
    {
      label: "AssemblyAI key (transcription)",
      ok: isSet(process.env.ASSEMBLYAI_API_KEY),
      hint: "Set ASSEMBLYAI_API_KEY from assemblyai.com.",
    },
    {
      label: "Anthropic key (AI clip detection)",
      ok: isSet(process.env.ANTHROPIC_API_KEY),
      hint: "Set ANTHROPIC_API_KEY from console.anthropic.com.",
    },
    {
      label: "Supabase service-role key (render worker)",
      ok: isSet(process.env.SUPABASE_SERVICE_ROLE_KEY),
      hint: "Set SUPABASE_SERVICE_ROLE_KEY (Supabase → Settings → API → service_role).",
    },
    {
      label: "Stripe keys (buying credits — optional)",
      ok: isSet(process.env.STRIPE_SECRET_KEY) &&
        isSet(process.env.STRIPE_WEBHOOK_SECRET),
      hint: "Optional. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to enable buying credits.",
    },
  ];

  let db: Check[] = [
    { label: "Database not reachable", ok: false, hint: "Add your Supabase keys first." },
  ];
  if (isSet(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
    try {
      const supabase = await createClient();
      const [videos, clips, profiles] = await Promise.all([
        tableExists(supabase, "videos"),
        tableExists(supabase, "clips"),
        tableExists(supabase, "profiles"),
      ]);
      db = [
        {
          label: "Migration 0001 — videos table",
          ok: videos,
          hint: "Run supabase/migrations/0001_videos.sql in the Supabase SQL Editor.",
        },
        {
          label: "Migration 0002 — clips table",
          ok: clips,
          hint: "Run supabase/migrations/0002_clips.sql.",
        },
        {
          label: "Migration 0005 — profiles / credits",
          ok: profiles,
          hint: "Run supabase/migrations/0005_credits.sql (and 0003, 0004 too).",
        },
      ];
    } catch {
      db = [
        {
          label: "Could not query the database",
          ok: false,
          hint: "Double-check your Supabase URL/key, then refresh.",
        },
      ];
    }
  }

  const ready =
    env[0].ok && db.every((c) => c.ok) && env[1].ok && env[2].ok;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="font-display text-2xl font-bold">
          AuraClip <span className="text-brand-gradient">AI</span> setup check
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This page updates as you fill in <code>.env.local</code> and run the
          SQL migrations. Restart the dev server after changing env values.
        </p>
      </div>

      <section className="glass flex flex-col gap-3 rounded-2xl p-5">
        <h2 className="font-display font-semibold">Environment keys</h2>
        <ul className="flex flex-col gap-3">
          {env.map((c) => (
            <Row key={c.label} {...c} />
          ))}
        </ul>
      </section>

      <section className="glass flex flex-col gap-3 rounded-2xl p-5">
        <h2 className="font-display font-semibold">Database migrations</h2>
        <ul className="flex flex-col gap-3">
          {db.map((c) => (
            <Row key={c.label} {...c} />
          ))}
        </ul>
      </section>

      {ready ? (
        <Link
          href="/login"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[linear-gradient(90deg,var(--brand-pink),var(--brand-cyan))] px-6 font-semibold text-[#1a0e2e]"
        >
          Looks good — go sign in <ArrowRight className="size-4" />
        </Link>
      ) : (
        <p className="text-center text-xs text-muted-foreground">
          Full step-by-step: docs/GETTING-STARTED.md
        </p>
      )}
    </div>
  );
}