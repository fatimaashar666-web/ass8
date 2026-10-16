"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed. Please try again.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />

      <section className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.logo} aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none">
              <path
                d="M24 4 41 11v12c0 11-7 17-17 21C14 40 7 34 7 23V11L24 4Z"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path
                d="m16 24 5 5 11-12"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className={styles.brandName}>CAMPUS<span>FIX</span></span>
        </div>

        <div className={styles.heading}>
          <div className={styles.eyebrow}>
            <span className={styles.statusDot} />
            SECURE ADMIN PORTAL
          </div>
          <h1>Welcome back</h1>
          <p>Sign in to manage campus issue reports.</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label htmlFor="password" className={styles.label}>
            Admin password
          </label>

          <div className={styles.inputWrap}>
            <svg
              className={styles.inputIcon}
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <rect x="4" y="10" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.7" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>

            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your admin password"
              autoComplete="current-password"
              required
              autoFocus
              className={styles.input}
            />

            <button
              type="button"
              className={styles.togglePassword}
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {error && (
            <p className={styles.error} role="alert">
              <span aria-hidden="true">!</span> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className={styles.submit}
          >
            {loading ? (
              <>
                <span className={styles.spinner} />
                Signing in...
              </>
            ) : (
              <>
                Sign in to dashboard
                <span aria-hidden="true">→</span>
              </>
            )}
          </button>
        </form>

        <div className={styles.securityNote}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 3 20 6v5c0 5-3.4 8-8 10-4.6-2-8-5-8-10V6l8-3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Your session is protected with secure authentication.
        </div>
      </section>

      <footer className={styles.footer}>
        <span>© 2026 Campus Fix</span>
        <span>Campus support &amp; facilities</span>
      </footer>
    </main>
  );
}