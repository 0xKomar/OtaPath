"use client";

/**
 * AuthGate — the patient app requires an account. Patients never
 * self-register: their clinician creates the login from the dashboard
 * and hands them the credentials (or scans the QR).
 *
 * Behavior:
 *  - Supabase env missing        → render children (offline/demo mode)
 *  - existing session            → resolve /api/patients/me → app
 *  - no session + demo env creds → silent sign-in (keeps the /demo
 *                                  iframe + fresh deploys seamless)
 *  - otherwise                   → warm sign-in card inside the phone
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { useOtaStore } from "@/store/useOtaStore";

type Phase = "checking" | "ready" | "login";

/** resolve the auth session → patient record id → store.patientId */
async function linkPatient(accessToken: string): Promise<void> {
  try {
    const res = await fetch("/api/patients/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const d = (await res.json()) as { patient?: { id?: string } };
      if (d.patient?.id) {
        const st = useOtaStore.getState();
        if (st.patientId !== d.patient.id) {
          // different account — drop the previous patient's state so
          // the sync layer rehydrates a clean session for this one
          useOtaStore.setState({
            memories: [],
            baseline: null,
            activeMission: null,
            walkedPath: [],
            hydrated: false,
          });
        }
        st.setPatientId(d.patient.id);
      }
    }
  } catch {
    // keep the default "matti" — the demo loop still works
  }
}

// deterministic on server + client — the browser bundle inlines
// NEXT_PUBLIC_* envs, so both sides compute the same initial phase
const AUTH_ENABLED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export function AuthGate({ children }: { children: React.ReactNode }) {
  // no Supabase env → open demo mode from the first paint
  const [phase, setPhase] = useState<Phase>(AUTH_ENABLED ? "checking" : "ready");
  const resolving = useRef(false);

  useEffect(() => {
    const sb = supabaseBrowser();
    if (!sb) return;
    let dead = false;
    (async () => {
      try {
        const { data } = await sb.auth.getSession();
        let session = data.session;
        if (!session) {
          const e = process.env.NEXT_PUBLIC_DEMO_EMAIL;
          const p = process.env.NEXT_PUBLIC_DEMO_PASSWORD;
          if (e && p) {
            const r = await sb.auth.signInWithPassword({ email: e, password: p });
            session = r.data.session;
          }
        }
        if (dead) return;
        if (session) {
          await linkPatient(session.access_token);
          if (!dead) setPhase("ready");
        } else {
          setPhase("login");
        }
      } catch {
        if (!dead) setPhase("login");
      }
    })();
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") setPhase("login");
    });
    return () => {
      dead = true;
      subscription.unsubscribe();
    };
  }, []);

  if (phase === "checking")
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-cream">
        <Image
          src="/logooatpath.png"
          alt="OtaPath"
          width={56}
          height={56}
          className="animate-bob rounded-2xl"
        />
        <p className="font-[family-name:var(--font-nunito)] text-[13px] font-semibold text-ink-charcoal/50">
          opening your map…
        </p>
      </div>
    );

  if (phase === "login")
    return (
      <LoginCard
        onSigned={() => {
          if (resolving.current) return;
          resolving.current = true;
          setPhase("ready");
        }}
      />
    );

  return children;
}

function LoginCard({ onSigned }: { onSigned: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const sb = supabaseBrowser();
    if (!sb || busy || !email.trim() || !password) return;
    setBusy(true);
    setError(null);
    const { data, error: err } = await sb.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (err || !data.session) {
      setError("Those details don't match — check the card from your care team.");
      setBusy(false);
      return;
    }
    await linkPatient(data.session.access_token);
    onSigned();
  }

  const field =
    "w-full rounded-2xl border-2 border-ink-charcoal/10 bg-white px-4 py-3 font-[family-name:var(--font-nunito)] text-[15px] font-semibold text-ink-charcoal placeholder:text-ink-charcoal/30 focus:border-solar focus:outline-none";

  return (
    <div className="flex h-full flex-col justify-center bg-cream px-7">
      <Image
        src="/logooatpath.png"
        alt="OtaPath"
        width={64}
        height={64}
        className="mb-5 rounded-2xl"
      />
      <h1 className="font-[family-name:var(--font-nunito)] text-[26px] font-black leading-tight text-ink-charcoal">
        Welcome back
      </h1>
      <p className="mt-1.5 font-[family-name:var(--font-nunito)] text-[14px] font-semibold leading-snug text-ink-charcoal/55">
        Your care team set this account up for you — sign in with the details
        they gave you.
      </p>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
        <input
          type="email"
          autoComplete="email"
          placeholder="Email"
          className={field}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          className={field}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p className="font-[family-name:var(--font-nunito)] text-[12px] font-bold text-tangerine">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !email.trim() || !password}
          className="mt-1 rounded-2xl border-b-4 border-[#C64F00] bg-tangerine px-4 py-3.5 font-[family-name:var(--font-nunito)] text-[15px] font-black text-white transition-transform active:scale-[0.98] disabled:opacity-40"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center font-[family-name:var(--font-nunito)] text-[11px] font-semibold leading-snug text-ink-charcoal/40">
        No account? Ask your clinician — they create one for you from their
        dashboard.
      </p>
    </div>
  );
}
