"use client";

import { ShieldCheck } from "lucide-react";
import { Logo } from "./Logo";

export function LoginPage() {
  return (
    <main className="min-h-screen bg-[#090D16] px-4 py-12 text-white">
      <section className="mx-auto flex min-h-[72vh] max-w-md flex-col justify-center border border-slate-800 bg-[#0F172A] p-8 shadow-2xl">
        <Logo size="lg" />
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Enterprise AI Visibility Workspace
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Internal access only.</h1>
        <p className="mt-4 text-sm leading-6 text-slate-300">
          Access is limited to the designated RAGSIGNAL owner account. Open the workspace with that ChatGPT account.
        </p>
        <div className="mt-6 flex items-start gap-3 border-l-2 border-[#D33A2C] bg-slate-900/70 p-3 text-xs leading-5 text-slate-300">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#D33A2C]" />
          Your account must be on the internal access list.
        </div>
      </section>
    </main>
  );
}
