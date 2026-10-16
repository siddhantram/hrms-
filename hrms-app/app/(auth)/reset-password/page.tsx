"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  async function resetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== form.get("confirmPassword")) {
      setMessage("Passwords do not match.");
      return;
    }
    setWorking(true);
    setMessage("");
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const result = await response.json();
    setWorking(false);
    if (response.ok) {
      router.replace("/login?reset=success");
      return;
    }
    setMessage(result.error ?? "Could not reset password.");
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Security</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Create new password</h1>
      </div>
      {!token ? <p role="alert" className="bg-amber-50 px-4 py-3 text-sm text-amber-900">This reset link is missing or invalid. Request another link.</p> : (
        <form onSubmit={resetPassword} className="space-y-5">
          <label className="block text-sm font-medium text-slate-700">New password<input type="password" name="password" required minLength={8} autoComplete="new-password" className="mt-2 block w-full border border-slate-300 bg-slate-50 px-3 py-2.5" /></label>
          <label className="block text-sm font-medium text-slate-700">Confirm password<input type="password" name="confirmPassword" required minLength={8} autoComplete="new-password" className="mt-2 block w-full border border-slate-300 bg-slate-50 px-3 py-2.5" /></label>
          {message && <p role="alert" className="bg-amber-50 px-4 py-3 text-sm text-amber-900">{message}</p>}
          <button disabled={working} className="w-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{working ? "Updating..." : "Update password"}</button>
        </form>
      )}
      <Link href="/forgot-password" className="mt-6 inline-block text-sm text-cyan-800 hover:underline">Request another reset link</Link>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<div className="w-full max-w-md text-slate-600">Loading reset form...</div>}><ResetPasswordForm /></Suspense>;
}
