"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Account = { firstName: string; lastName: string; email: string; role: string; company: { name: string } };

export default function SettingsPage() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadAccount() {
      const response = await fetch("/api/auth/settings", { cache: "no-store" });
      const result = await response.json();
      if (!active) return;
      if (response.ok) setAccount(result.data);
      else setError(result.error ?? "Could not load account settings.");
      setLoading(false);
    }
    void loadAccount();
    return () => { active = false; };
  }, []);

  async function updateProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setMessage("");
    setError("");
    const response = await fetch("/api/auth/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())),
    });
    const result = await response.json();
    setWorking(false);
    if (!response.ok) {
      setError(result.error ?? "Could not update profile.");
      return;
    }
    setAccount((current) => current ? { ...current, ...result.data } : current);
    setMessage("Profile updated.");
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    if (values.get("newPassword") !== values.get("confirmPassword")) {
      setError("New passwords do not match.");
      return;
    }
    setWorking(true);
    setMessage("");
    setError("");
    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: values.get("currentPassword"), newPassword: values.get("newPassword") }),
    });
    const result = await response.json();
    setWorking(false);
    if (!response.ok) {
      setError(result.error ?? "Could not change password.");
      return;
    }
    form.reset();
    setMessage(result.message);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div><p className="text-sm uppercase tracking-[0.2em] text-slate-500">Account</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Settings</h1></div>
          <button onClick={() => void logout()} className="border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">Sign out</button>
        </div>
        {message && <p role="status" className="mb-4 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
        {error && <p role="alert" className="mb-4 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</p>}
        {loading && <p className="text-sm text-slate-500">Loading settings...</p>}
        {!loading && account && <div className="space-y-6">
          <section className="border-y border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
            <p className="mt-1 text-sm text-slate-500">{account.email} · {account.role.replaceAll("_", " ")} · {account.company.name}</p>
            <form onSubmit={updateProfile} className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-slate-700">First name<input name="firstName" required minLength={2} maxLength={80} defaultValue={account.firstName} className="mt-1 block w-full border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm text-slate-700">Last name<input name="lastName" required minLength={2} maxLength={80} defaultValue={account.lastName} className="mt-1 block w-full border border-slate-300 px-3 py-2" /></label>
              <button disabled={working} className="w-fit bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">Save profile</button>
            </form>
          </section>
          <section className="border-y border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">Change password</h2>
            <form onSubmit={changePassword} className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-slate-700 sm:col-span-2">Current password<input name="currentPassword" type="password" required minLength={8} autoComplete="current-password" className="mt-1 block w-full border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm text-slate-700">New password<input name="newPassword" type="password" required minLength={8} autoComplete="new-password" className="mt-1 block w-full border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm text-slate-700">Confirm new password<input name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" className="mt-1 block w-full border border-slate-300 px-3 py-2" /></label>
              <button disabled={working} className="w-fit bg-cyan-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">Update password</button>
            </form>
          </section>
        </div>}
      </div>
    </main>
  );
}
