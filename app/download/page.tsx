"use client";

import Link from "next/link";
import { useState } from "react";

export default function DownloadPage() {
  const [downloading, setDownloading] = useState(false);

  function downloadAPK() {
    setDownloading(true);

    const link = document.createElement("a");
    link.href = "/MR-ELON-HACKER.apk";
    link.download = "MR-ELON-HACKER.apk";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloading(false);
    }, 1500);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030508] text-white">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-180px] h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[140px]" />
        <div className="absolute bottom-[-200px] left-[-150px] h-[450px] w-[450px] rounded-full bg-blue-600/10 blur-[140px]" />
        <div className="absolute right-[-150px] top-[35%] h-[400px] w-[400px] rounded-full bg-purple-600/10 blur-[140px]" />
      </div>

      {/* Grid */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      {/* Header */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 shadow-[0_0_30px_rgba(34,211,238,.12)]">
            <span className="text-xl">⚡</span>
          </div>

          <div>
            <div className="text-sm font-black tracking-[0.18em]">
              MR ELON
            </div>

            <div className="text-[10px] font-bold tracking-[0.3em] text-cyan-400">
              HACKER
            </div>
          </div>
        </Link>

        <Link
          href="/"
          className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/60 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-white"
        >
          ← Back to AI
        </Link>
      </header>

      {/* Main */}
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-100px)] max-w-6xl items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-3xl">

          {/* Badge */}
          <div className="mb-6 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.06] px-4 py-2 text-xs font-bold tracking-wider text-cyan-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
              OFFICIAL ANDROID APP
            </div>
          </div>

          {/* Heading */}
          <div className="text-center">
            <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
              MR ELON{" "}
              <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                HACKER
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/45 sm:text-base">
              Your personal AI assistant, now available as an Android
              application.
            </p>
          </div>

          {/* Main card */}
          <div className="mx-auto mt-10 max-w-xl rounded-[32px] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/50 backdrop-blur-2xl sm:p-8">

            {/* App icon */}
            <div className="flex justify-center">
              <div className="relative flex h-28 w-28 items-center justify-center rounded-[32px] border border-cyan-300/20 bg-gradient-to-br from-cyan-400/15 via-blue-500/10 to-purple-500/10 shadow-[0_0_70px_rgba(34,211,238,.14)]">
                <span className="text-5xl">🤖</span>

                <span className="absolute right-0 top-0 h-5 w-5 rounded-full border-4 border-[#070a0e] bg-emerald-400" />
              </div>
            </div>

            {/* App name */}
            <div className="mt-7 text-center">
              <h2 className="text-2xl font-black">
                MR ELON HACKER
              </h2>

              <p className="mt-2 text-sm text-white/40">
                Official Android Application
              </p>
            </div>

            {/* Information */}
            <div className="mt-7 grid grid-cols-3 gap-2 sm:gap-3">
              <InfoCard
                title="VERSION"
                value="Latest"
              />

              <InfoCard
                title="PLATFORM"
                value="Android"
              />

              <InfoCard
                title="FORMAT"
                value="APK"
              />
            </div>

            {/* Features */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Feature
                icon="🎤"
                title="Voice Input"
                description="Talk with AI"
              />

              <Feature
                icon="🔊"
                title="Voice Output"
                description="Listen to AI"
              />

              <Feature
                icon="🧠"
                title="AI Assistant"
                description="Smart responses"
              />

              <Feature
                icon="⚡"
                title="Fast"
                description="Modern experience"
              />
            </div>

            {/* Download button */}
            <button
              type="button"
              onClick={downloadAPK}
              disabled={downloading}
              className="mt-7 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-4 text-sm font-black text-black shadow-[0_0_35px_rgba(34,211,238,.18)] transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_0_55px_rgba(34,211,238,.30)] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
            >
              {downloading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                  Downloading...
                </>
              ) : (
                <>
                  <DownloadIcon />
                  Download APK
                </>
              )}
            </button>

            {/* File info */}
            <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-white/30">
              <span>📦</span>
              <span>MR-ELON-HACKER.apk</span>
            </div>
          </div>

          {/* Installation note */}
          <div className="mx-auto mt-7 max-w-xl rounded-2xl border border-white/8 bg-white/[0.025] p-4 text-center">
            <p className="text-xs font-bold text-white/60">
              📱 Android Installation
            </p>

            <p className="mt-2 text-[11px] leading-5 text-white/30">
              Download the APK, open it on your Android device, and follow
              Android's installation instructions. Install applications only
              from sources you trust.
            </p>
          </div>

          {/* Back button */}
          <div className="flex justify-center pt-7">
            <Link
              href="/"
              className="text-xs text-white/30 transition hover:text-cyan-300"
            >
              ← Return to MR ELON HACKER
            </Link>
          </div>

          {/* Footer */}
          <footer className="pb-8 pt-8 text-center">
            <p className="text-[10px] tracking-[0.25em] text-white/15">
              MR ELON HACKER
            </p>
          </footer>
        </div>
      </section>
    </main>
  );
}

/* -------------------------------- */
/* Info Card                        */
/* -------------------------------- */

function InfoCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 px-2 py-4 text-center">
      <div className="text-[9px] font-bold tracking-wider text-white/25">
        {title}
      </div>

      <div className="mt-1 text-sm font-bold text-white/75">
        {value}
      </div>
    </div>
  );
}

/* -------------------------------- */
/* Feature Card                     */
/* -------------------------------- */

function Feature({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
      <div className="text-xl">{icon}</div>

      <div className="mt-2 text-xs font-bold text-white/75">
        {title}
      </div>

      <div className="mt-1 text-[10px] text-white/25">
        {description}
      </div>
    </div>
  );
}

/* -------------------------------- */
/* Download Icon                    */
/* -------------------------------- */

function DownloadIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}