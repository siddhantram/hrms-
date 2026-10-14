export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Security</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Create new password</h1>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
        Token verification and secure password reset can be implemented in the production auth phase.
      </div>
    </div>
  );
}
