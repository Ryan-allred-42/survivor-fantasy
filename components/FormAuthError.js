"use client";

import { useActionState } from "react";

export default function FormAuthError({ action, children }) {
  const [state, formAction, isPending] = useActionState(
    async (_, formData) => {
      const result = await action(formData);
      return result ?? null;
    },
    null
  );

  return (
    <form action={formAction}>
      {state?.error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-sm">
          {state.error}
        </div>
      )}
      {children}
    </form>
  );
}
