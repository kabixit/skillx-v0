"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  AuthError,
  User,
  onAuthStateChanged  // Add this import
} from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icons } from "@/components/icons";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState({
    email: false,
    google: false,
    github: false
  });
  const [error, setError] = useState("");
  const router = useRouter();

  // Monitor auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        console.log("Authenticated user detected, redirecting...");
        router.push("/dashboard");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading({...isLoading, email: true});
    
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log("SignIn result:", result);
    } catch (err) {
      const error = err as AuthError;
      console.error("SignIn error:", error);
      setError(error.message || "Sign in failed. Please try again.");
    } finally {
      setIsLoading({...isLoading, email: false});
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "github") => {
    setIsLoading({...isLoading, [provider]: true});
    
    try {
      const authProvider = provider === "google" 
        ? new GoogleAuthProvider() 
        : new GithubAuthProvider();
      
      await signInWithPopup(auth, authProvider);
      router.push("/dashboard");
    } catch (error) {
      const authError = error as AuthError;
      alert(authError.message || `${provider} sign in failed. Please try again.`);
    } finally {
      setIsLoading({...isLoading, [provider]: false});
    }
  };

  return (
    <div className="grid gap-6">
      <form onSubmit={handleEmailSignIn}>
        <div className="grid gap-2">
          <div className="grid gap-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              placeholder="name@example.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading.email}
              required
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading.email}
              required
            />
          </div>
          <Button type="submit" disabled={isLoading.email}>
            {isLoading.email && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            Sign In with Email
          </Button>
        </div>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          type="button"
          onClick={() => handleOAuthSignIn("google")}
          disabled={isLoading.google}
          className="w-full"
        >
          {isLoading.google ? (
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Icons.google className="mr-2 h-4 w-4" />
          )}
          Google
        </Button>

        <Button
          variant="outline"
          type="button"
          onClick={() => handleOAuthSignIn("github")}
          disabled={isLoading.github}
          className="w-full"
        >
          {isLoading.github ? (
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Icons.gitHub className="mr-2 h-4 w-4" />
          )}
          GitHub
        </Button>
      </div>
    </div>
  );
}