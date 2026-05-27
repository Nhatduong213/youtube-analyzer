"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2, CheckCircle2, ArrowRight } from "lucide-react";

import Link from "next/link";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        setError(error.message);
      } else if (data.session) {
        router.push("/");
        router.refresh();
      } else {
        setSuccessMessage("Check your email to confirm your account before logging in.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        router.push("/");
        router.refresh();
      }
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-background relative">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px]" />
      </div>

      <Card className="w-full max-w-md glass-card z-10 relative border-t-4 border-t-primary">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-center">
            {isSignUp ? "Create an Account" : "Welcome Back"}
          </CardTitle>
          <CardDescription className="text-center">
            {isSignUp ? "Sign up to start tracking your channel" : "Sign in to BA Analyzer"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {successMessage ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-4 text-center animate-in zoom-in duration-500">
              <CheckCircle2 className="h-16 w-16 text-emerald-500" />
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Success</h3>
                <p className="text-muted-foreground text-sm">{successMessage}</p>
              </div>
              <Button variant="outline" className="mt-4" onClick={() => { setIsSignUp(false); setSuccessMessage(null); }}>
                Back to Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="m@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                    minLength={6}
                    className="bg-background/50"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">{error}</p>}
              
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 mt-2" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  isSignUp ? <ArrowRight className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />
                )}
                {isSignUp ? "Sign Up" : "Sign In"}
              </Button>
            </form>
          )}
        </CardContent>
        {!successMessage && (
          <CardFooter className="flex justify-center border-t border-border/50 bg-muted/10 py-4">
            <p className="text-sm text-muted-foreground">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button 
                type="button" 
                onClick={() => { setIsSignUp(!isSignUp); setError(null); }} 
                className="font-medium text-primary hover:underline hover:text-primary/80 transition-colors"
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </p>
          </CardFooter>
        )}
      </Card>

      <div className="absolute bottom-6 left-0 right-0 text-center text-xs text-muted-foreground/60 z-10 space-x-4">
        <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy / Chính sách bảo mật</Link>
        <span>•</span>
        <Link href="/terms" className="hover:text-white transition-colors">Terms of Service / Điều khoản dịch vụ</Link>
      </div>
    </div>
  );
}
