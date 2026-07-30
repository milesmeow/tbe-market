"use client";

import Image from "next/image";
import { useActionState } from "react";

import { APP_NAME } from "@/lib/config";
import {
  FormError,
  SubmitButton,
  inputClass,
  labelClass,
} from "@/components/ui";

import { login, type AuthFormState } from "./actions";

export default function LoginPage() {
  const [state, formAction] = useActionState<AuthFormState, FormData>(login, {});

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Image
          src="/tbe-logo.png"
          alt="Temple Beth El"
          width={72}
          height={72}
          className="mx-auto block h-[72px] w-[72px]"
          priority
        />
        <h1 className="mt-4 text-center text-2xl font-semibold text-slate-900">
          {APP_NAME}
        </h1>
        <div className="mx-auto mt-3 h-0.5 w-12 rounded-full bg-gold-500" />
        <p className="mt-3 text-center text-sm text-slate-500">
          Sign in to your account
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="password" className={labelClass}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={inputClass}
            />
          </div>

          <FormError message={state.error} />

          <SubmitButton pendingText="Signing in…" className="w-full rounded-lg bg-slate-900 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-slate-700 disabled:opacity-50">
            Sign in
          </SubmitButton>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Members are invited by an administrator.
        </p>
      </div>
    </main>
  );
}
