"use client";

/**
 * AddPatientModal — the clinician enrolls a patient by creating their
 * OtaPath login. Patients never self-register: the doctor types name +
 * email, optionally their own password or an auto-generated friendly
 * one, and the result screen shows the credentials once — ready to
 * write on the discharge card.
 */

import { useState } from "react";
import { Check, Copy, KeyRound, UserPlus, X } from "lucide-react";
import { api } from "@/lib/api";

const FIELD =
  "w-full rounded-lg border border-[#E6E6E3] bg-white px-3 py-2 font-sans text-[13px] font-medium text-zinc-800 placeholder:text-zinc-300 focus:border-zinc-400 focus:outline-none";
const LABEL = "mb-1 block font-sans text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400";

export function AddPatientModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [autoPw, setAutoPw] = useState(true);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    id: string;
    name: string;
    email: string;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit() {
    if (!name.trim() || !email.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.createPatientAccount({
        name: name.trim(),
        email: email.trim(),
        note: note.trim() || undefined,
        password: autoPw ? undefined : password,
      });
      setCreated({
        id: r.patient.id,
        name: r.patient.name,
        email: r.credentials.email,
        password: r.credentials.password ?? password,
      });
    } catch (e) {
      setError(e instanceof Error && e.message.startsWith("api 409")
        ? "That email already has an account."
        : "Couldn't create the account — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copyCreds() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(
        `${created.name}\nemail: ${created.email}\npassword: ${created.password}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div className="toast-in fixed inset-0 z-[2000] flex items-center justify-center bg-zinc-950/30 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#E6E6E3] bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-orange-600">
              {created ? "Account created" : "Add patient"}
            </p>
            <h3 className="mt-0.5 font-sans text-lg font-semibold tracking-[-0.02em] text-zinc-900">
              {created ? `${created.name} can sign in now` : "Create their login"}
            </h3>
            {!created && (
              <p className="mt-1 font-sans text-[12px] font-medium leading-snug text-zinc-500">
                Patients can&rsquo;t register themselves — you create the
                account here and hand them the details.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6E6E3] bg-white text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-800"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        {created ? (
          <>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
              <div className="flex items-center justify-between font-sans text-[12px]">
                <span className="font-medium text-zinc-500">email</span>
                <span className="font-bold tabular-nums text-zinc-800">{created.email}</span>
              </div>
              <div className="mt-2 flex items-center justify-between font-sans text-[12px]">
                <span className="font-medium text-zinc-500">password</span>
                <span className="font-mono font-bold text-zinc-800">{created.password}</span>
              </div>
            </div>
            <p className="mt-2.5 font-sans text-[11px] font-medium leading-snug text-zinc-500">
              This password is shown once — copy it now or write it on the
              discharge card. They can change it after first sign-in.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={copyCreds}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#E6E6E3] bg-white px-3 py-2.5 font-sans text-[13px] font-bold text-zinc-700 transition-colors hover:border-zinc-300"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" strokeWidth={2.5} />
                ) : (
                  <Copy className="h-4 w-4" strokeWidth={2.5} />
                )}
                {copied ? "Copied" : "Copy credentials"}
              </button>
              <button
                type="button"
                onClick={() => {
                  onAdded(created.id);
                  onClose();
                }}
                className="flex flex-1 items-center justify-center rounded-lg bg-[#18181B] px-3 py-2.5 font-sans text-[13px] font-bold text-white transition-colors hover:bg-zinc-800"
              >
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <label className="block">
              <span className={LABEL}>Patient&rsquo;s full name</span>
              <input
                className={FIELD}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kaisa Lehto"
                autoFocus
              />
            </label>
            <label className="mt-3 block">
              <span className={LABEL}>Login email</span>
              <input
                className={FIELD}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kaisa@example.com"
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
            </label>
            <label className="mt-3 block">
              <span className={LABEL}>Clinical note (optional)</span>
              <input
                className={FIELD}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. rTMS · week 3"
              />
            </label>

            <label className="mt-3.5 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={autoPw}
                onChange={(e) => setAutoPw(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-zinc-300 accent-zinc-800"
              />
              <span className="font-sans text-[12px] font-medium text-zinc-600">
                Auto-generate a friendly password
              </span>
            </label>
            {!autoPw && (
              <input
                className={`${FIELD} mt-2`}
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="min. 6 characters"
              />
            )}

            {error && (
              <p className="mt-2 font-sans text-[11px] font-semibold text-orange-600">{error}</p>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={
                !name.trim() || !email.trim() || (!autoPw && password.length < 6) || busy
              }
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#18181B] px-3 py-2.5 font-sans text-[13px] font-bold text-white transition-colors hover:bg-zinc-800 disabled:opacity-40"
            >
              {busy ? (
                <UserPlus className="h-4 w-4" strokeWidth={2.5} />
              ) : (
                <KeyRound className="h-4 w-4" strokeWidth={2.5} />
              )}
              {busy ? "Creating…" : "Create patient account"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
