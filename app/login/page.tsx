"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        setMessage("✅ Account create ho gaya! Ab login karo.");
        setIsSignup(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        window.location.href = "/";
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `❌ ${error.message}`
          : "❌ Kuch error aa gaya."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mb-4 text-4xl">⚡</div>

          <h1 className="text-2xl font-bold">
            MR ELON HACKER
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            {isSignup
              ? "Create your AI account"
              : "Welcome back"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm outline-none placeholder:text-zinc-500 focus:border-zinc-500"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm outline-none placeholder:text-zinc-500 focus:border-zinc-500"
          />

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-white font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : isSignup
                ? "Create Account"
                : "Login"}
          </button>
        </form>

        {message && (
          <p className="mt-4 text-center text-sm text-zinc-300">
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={() => {
            setIsSignup(!isSignup);
            setMessage("");
          }}
          className="mt-6 w-full text-center text-sm text-zinc-500 hover:text-white"
        >
          {isSignup
            ? "Already have an account? Login"
            : "Don't have an account? Create one"}
        </button>
      </div>
    </main>
  );
}