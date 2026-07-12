"use client";

import { useActionState } from "react";

import { loginAction, type LoginActionState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { FormField, FormInput } from "@/components/ui/form-field";
import { Alert } from "@/components/ui/alert";

const initialState: LoginActionState = { error: null };

type LoginFormProps = {
  redirectTo?: string;
};

export function LoginForm({ redirectTo = "/dashboard" }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="redirect" value={redirectTo} />

      <FormField id="email" label="Email">
        <FormInput
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending}
          placeholder="you@example.com"
        />
      </FormField>

      <FormField id="password" label="Password">
        <FormInput
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
        />
      </FormField>

      {state.error ? (
        <Alert variant="error" message={state.error} />
      ) : null}

      <Button type="submit" variant="primary" disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
