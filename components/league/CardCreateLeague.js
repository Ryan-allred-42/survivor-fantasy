"use client";

import { useState, useActionState } from "react";
import { createLeague } from "@/actions/leagues";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CardCreateLeague() {
  const [open, setOpen] = useState(false);
  const [createdLeague, setCreatedLeague] = useState(null);

  const [state, formAction, isPending] = useActionState(async (_, formData) => {
    const result = await createLeague(formData);
    if (result.success) setCreatedLeague(result.league);
    return result;
  }, null);

  function handleClose(isOpen) {
    setOpen(isOpen);
    if (!isOpen) setCreatedLeague(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <button className="gradient-card border border-border hover:border-primary/50 rounded-2xl p-8 text-left transition-all group cursor-pointer w-full flex flex-col h-full">
          <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mb-5 group-hover:bg-primary/25 transition-colors shrink-0">
            <span className="text-2xl">🏝️</span>
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Create a League</h3>
          <p className="text-sm text-muted-foreground leading-relaxed flex-1">
            Start a new league and share the invite code with your tribe. All leagues use Full Season scoring.
          </p>
          <div className="mt-5 text-xs font-semibold text-primary group-hover:underline">
            Create league →
          </div>
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {createdLeague ? "League Created!" : "Create a League"}
          </DialogTitle>
        </DialogHeader>

        {createdLeague ? (
          <div className="space-y-6 py-2">
            <p className="text-muted-foreground text-sm">
              Your league <span className="text-foreground font-semibold">{createdLeague.name}</span> is ready.
              Share this code with your friends:
            </p>
            <div className="flex items-center justify-center">
              <div className="bg-primary/10 border-2 border-primary/40 rounded-2xl px-10 py-6 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Join Code</p>
                <p className="text-5xl font-black tracking-[0.3em] text-gradient">{createdLeague.join_code}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Anyone with this code can join your league from the dashboard.
            </p>
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              asChild
            >
              <a href={`/league/${createdLeague.id}`}>Go to League</a>
            </Button>
          </div>
        ) : (
          <form action={formAction} className="space-y-6 py-2">
            {state?.error && (
              <div className="px-4 py-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-sm">
                {state.error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="league-name" className="text-foreground">League Name</Label>
              <Input
                id="league-name"
                name="name"
                placeholder="The Outcast Alliance"
                required
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
              <p className="font-bold text-sm text-emerald-400 mb-1">Full Season Scoring</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Every elimination scores points. Points × multiplier based on boot order — early boots are cheap, the top 5 are worth a fortune.
              </p>
            </div>
            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11"
            >
              {isPending ? "Creating..." : "Create League"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
