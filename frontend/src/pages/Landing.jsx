import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "var(--cream)" }}>
      {/* Top strip */}
      <div className="border-b hairline">
        <div className="max-w-[1360px] mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className="font-serif-editorial text-[22px] leading-none">Linchub</span>
            <span className="eyebrow">Boutique Recruitment Ecosystem</span>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <span className="pill">Super Admin Controlled System</span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="max-w-[1360px] mx-auto px-8 pt-20 pb-24 grid grid-cols-12 gap-10">
        <div className="col-span-12 md:col-span-8">
          <div className="eyebrow mb-8 fade-up">Linchub Tracking SaaS · Vol. 01 · MMXXVI</div>
          <h1
            className="font-serif-editorial text-[52px] sm:text-[68px] lg:text-[84px] leading-[0.98] tracking-[-0.02em] fade-up"
            style={{ animationDelay: ".05s" }}
          >
            Building exceptional talent.<br />
            <span className="italic text-[color:var(--ink-2)]">Empowering</span> exceptional businesses.
          </h1>
          <p
            className="mt-8 max-w-[560px] text-[15px] text-[color:var(--ink-2)] leading-relaxed fade-up"
            style={{ animationDelay: ".12s" }}
          >
            We connect companies with high-performing professionals across industries and around the world —
            through a single, quietly powerful operating layer for recruitment.
          </p>

          <div className="mt-12 flex flex-wrap items-center gap-3 fade-up" style={{ animationDelay: ".18s" }}>
            <Link
              to="/login"
              data-testid="landing-login-btn"
              className="group inline-flex items-center gap-3 pl-6 pr-4 py-3.5 rounded-full bg-[color:var(--ink)] text-[color:var(--cream)] hover:bg-[color:var(--ink-2)] transition-colors"
            >
              <span className="text-[13px] tracking-widest uppercase font-mono-ed">Login Portal Access</span>
              <span className="grid place-items-center h-7 w-7 rounded-full bg-[color:var(--cream)] text-[color:var(--ink)] transition-transform group-hover:translate-x-0.5">
                <ArrowRight size={14} />
              </span>
            </Link>
            <span className="text-[12px] text-[color:var(--ink-3)] font-mono-ed uppercase tracking-widest ml-2">
              Client · Karyawan · Corporate
            </span>
          </div>
        </div>

        <aside className="col-span-12 md:col-span-4 md:pl-10 md:border-l hairline">
          <div className="eyebrow mb-4">Sistem Core</div>
          <p className="text-[13.5px] text-[color:var(--ink-2)] leading-relaxed">
            Arsitektur antarmuka, modul kerja, kalkulator biaya otomatis, dan hak akses terpusat —
            dirancang untuk menyatu, bukan bersinar.
          </p>
          <div className="mt-8 space-y-4">
            {[
              ["250+", "Companies trusted us", "From high-growth startups to global enterprises"],
              ["25+", "Diverse industries", "We understand specialized business & talent needs"],
              ["∞", "Global talent network", "Instant access to pre-screened top professionals"],
            ].map(([k, t, s]) => (
              <div key={t} className="pt-4 border-t hairline">
                <div className="flex items-baseline gap-3">
                  <span className="font-serif-editorial text-[28px]">{k}</span>
                  <span className="text-[13px] font-medium">{t}</span>
                </div>
                <div className="text-[12px] text-[color:var(--ink-3)] mt-1">{s}</div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      {/* Marquee ticker */}
      <div className="border-y hairline bg-[color:var(--cream-2)]">
        <div className="max-w-[1360px] mx-auto px-8 py-4 flex items-center gap-8 overflow-x-auto text-[11px] font-mono-ed uppercase tracking-widest text-[color:var(--ink-3)]">
          <span>Project Pipeline</span><span>·</span>
          <span>Candidate Tracking</span><span>·</span>
          <span>Master Pricing Calculator</span><span>·</span>
          <span>Live Invoice Engine</span><span>·</span>
          <span>Cashflow Analytics</span><span>·</span>
          <span>RBAC Central</span><span>·</span>
          <span>Immutable Audit Trail</span>
        </div>
      </div>

      {/* Modules */}
      <section className="max-w-[1360px] mx-auto px-8 py-24">
        <div className="grid grid-cols-12 gap-10">
          <div className="col-span-12 md:col-span-4">
            <div className="eyebrow mb-4">§ 02 — Modules</div>
            <h2 className="font-serif-editorial text-[38px] leading-[1.05] tracking-tight">
              One system. <br /> Every stage of the boutique.
            </h2>
          </div>
          <div className="col-span-12 md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-8">
            {[
              ["Project", "Lead intake, kanban pipeline, acquisition analytics, and auto-archiving of closed-out months."],
              ["Candidate", "From CDD interview to OJT 14-days to PKWT & offering — with target vs achievement tracking."],
              ["Billing", "Master pricing calculator (Fractional / Stages / Massive), live invoice template, cashflow."],
              ["Analyst", "Executive KPIs, funnel bottlenecks, and one-click CSV / XLSX / PDF export."],
            ].map(([t, d]) => (
              <div key={t} className="pt-5 border-t hairline">
                <div className="flex items-baseline justify-between mb-1.5">
                  <h3 className="font-serif-editorial text-[22px]">{t}</h3>
                  <span className="eyebrow">Module</span>
                </div>
                <p className="text-[13.5px] text-[color:var(--ink-2)] leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA foot */}
      <section className="border-t hairline">
        <div className="max-w-[1360px] mx-auto px-8 py-12 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="eyebrow mb-3">Access the portal</div>
            <h3 className="font-serif-editorial text-[36px] leading-tight">
              Login sekali. <span className="italic">Semua terhubung.</span>
            </h3>
          </div>
          <Link
            to="/login"
            data-testid="landing-login-bottom-btn"
            className="group inline-flex items-center gap-3 pl-6 pr-4 py-3.5 rounded-full bg-[color:var(--ink)] text-[color:var(--cream)] hover:bg-[color:var(--ink-2)] transition-colors"
          >
            <span className="text-[13px] tracking-widest uppercase font-mono-ed">Login Portal Access</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      <footer className="border-t hairline">
        <div className="max-w-[1360px] mx-auto px-8 py-5 text-[11px] text-[color:var(--ink-3)] font-mono-ed uppercase tracking-widest flex items-center justify-between">
          <span>Confidential Architecture & UI Blueprint</span>
          <span>PT. Linchub Network Indonesia</span>
        </div>
      </footer>
    </div>
  );
}
