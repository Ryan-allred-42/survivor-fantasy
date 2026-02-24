"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { joinLeague } from "@/actions/leagues";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CardJoinLeague() {
  const router = useRouter();

  const [state, formAction, isPending] = useActionState(async (_, formData) => {
    const result = await joinLeague(formData);
    if (result.success) router.push(`/league/${result.league.id}`);
    return result;
  }, null);

  return (
    /* flex column so content fills height and form stays at the bottom — matches CardCreateLeague */
    <div className="gradient-card border border-border rounded-2xl p-8 flex flex-col h-full">
      <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center mb-5 shrink-0">
        <span className="text-2xl">🔑</span>
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">Join a League</h3>
      <p className="text-sm text-muted-foreground leading-relaxed flex-1">
        Enter the 5-character code your league commissioner shared with you.
      </p>

      <form action={formAction} className="mt-5 space-y-4">
        {state?.error && (
          <div className="px-4 py-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-sm">
            {state.error}
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="join_code" className="text-foreground">Join Code</Label>
          <Input
            id="join_code"
            name="join_code"
            placeholder="XK7R2"
            maxLength={5}
            className="bg-input border-border text-foreground placeholder:text-muted-foreground uppercase tracking-[0.3em] text-lg font-bold text-center h-12"
            onChange={(e) => (e.target.value = e.target.value.toUpperCase())}
          />
        </div>
        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold h-11"
        >
          {isPending ? "Joining..." : "Join League"}
        </Button>
      </form>
    </div>
  );
}
