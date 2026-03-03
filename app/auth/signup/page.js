import Link from "next/link";
import { signUp } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FormAuthError from "@/components/FormAuthError";

export const metadata = { title: "Create Account — Survivor Fantasy" };

export default function SignUpPage() {
  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="text-2xl font-black tracking-tight text-gradient">SURVIVOR</span>
            <span className="block text-xs tracking-[0.3em] text-muted-foreground uppercase mt-1">
              Fantasy Season 50
            </span>
          </Link>
        </div>

        <div className="gradient-card border border-border rounded-2xl p-8 shadow-2xl">
          <h1 className="text-2xl font-bold text-foreground mb-2">Create your account</h1>
          <p className="text-muted-foreground text-sm mb-8">Join the Season 50 fantasy experience</p>

          <FormAuthError action={signUp}>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="display_name" className="text-foreground">Display Name</Label>
                <Input
                  id="display_name"
                  name="display_name"
                  type="text"
                  placeholder="TribeLeader42"
                  required
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">This is how you'll appear on leaderboards</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11">
                Create Account
              </Button>
            </div>
          </FormAuthError>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
