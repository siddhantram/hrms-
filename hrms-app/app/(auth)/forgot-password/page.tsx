"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  async function requestReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setMessage("");
    const email = new FormData(event.currentTarget).get("email");
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const result = await response.json();
    setWorking(false);
    setMessage(response.ok ? result.message : result.error ?? "Could not send reset instructions.");
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Account help</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Reset your password</h1>
      </div>
      <form onSubmit={requestReset} className="space-y-5">
        <label className="block text-sm font-medium text-slate-700">Email<input type="email" name="email" required autoComplete="email" className="mt-2 block w-full border border-slate-300 bg-slate-50 px-3 py-2.5" placeholder="you@company.com" /></label>
        {message && <p role="status" className="bg-cyan-50 px-4 py-3 text-sm text-cyan-900">{message}</p>}
        <button disabled={working} className="w-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{working ? "Sending..." : "Send reset link"}</button>
      </form>
      <Link href="/login" className="mt-6 inline-block text-sm text-cyan-800 hover:underline">Back to sign in</Link>
    </div>
  );
}
