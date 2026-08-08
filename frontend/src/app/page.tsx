import Link from "next/link";
import { Logo } from "@/components/Logo";
import { GlowButton } from "@/components/GlowButton";

export default function LandingPage() {
  return (
    <main className="relative flex-1 flex flex-col items-center justify-center text-center px-6 py-24 overflow-hidden">
      <div
        className="absolute top-1/2 left-1/2 w-[640px] h-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl animate-pulse-glow"
        style={{
          background:
            "radial-gradient(circle, rgba(241,211,43,0.30), rgba(30,189,219,0.10) 45%, transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, rgba(241,211,43,0.12), transparent 55%), radial-gradient(circle at 20% 80%, rgba(30,189,219,0.10), transparent 50%)",
        }}
      />

      <div className="relative z-10 mb-6">
        <Logo size={160} />
      </div>

      <h1 className="relative z-10 font-logo text-6xl sm:text-8xl tracking-wide">
        <span className="text-white">MONAD</span>{" "}
        <span className="text-brand-gold">BATTLE ROYALE</span>
      </h1>

      <p className="relative z-10 mt-6 max-w-xl text-brand-gray text-base sm:text-lg">
        Every move is a transaction. Last wallet standing wins.
      </p>
      <p className="relative z-10 mt-2 max-w-lg text-sm text-brand-gray/80">
        Attack, defend and heal through real Monad transactions.
      </p>

      <div className="relative z-10 mt-10 flex flex-wrap items-center justify-center gap-4">
        <GlowButton color="gold" href="/game">
          Join Match
        </GlowButton>
        <GlowButton color="blue" href="/arena">
          Watch Live
        </GlowButton>
      </div>

      <Link
        href="/admin"
        className="relative z-10 mt-14 text-[0.65rem] tracking-[0.2em] uppercase text-brand-gray/60 hover:text-brand-gray"
      >
        Host controls
      </Link>
    </main>
  );
}
