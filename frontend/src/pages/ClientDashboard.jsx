import { useEffect, useMemo, useState } from "react";
import { api, currency, shortDate } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Users, Building2 } from "lucide-react";

const STAGE_PILL = {
  INTERVIEW: "INTERVIEW",
  OJT: "OJT",
  PKWT: "PKWT",
};

export default function ClientDashboard() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [projects, setProjects] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [companyFilter, setCompanyFilter] = useState("All");

  useEffect(() => {
    api.get("/projects").then(({ data }) => setProjects(data)).catch(() => {});
    api.get("/invoices").then(({ data }) => setInvoices(data)).catch(() => {});
    api.get("/candidates").then(({ data }) => setCandidates(data)).catch(() => {});
  }, []);

  const companies = useMemo(() => {
    const set = new Set();
    candidates.forEach((c) => c.client_company && set.add(c.client_company));
    projects.forEach((p) => p.company_name && set.add(p.company_name));
    return ["All", ...Array.from(set)];
  }, [candidates, projects]);

  const filteredCandidates = useMemo(() => {
    if (companyFilter === "All") return candidates;
    const f = companyFilter.trim().toLowerCase();
    return candidates.filter((c) => (c.client_company || "").trim().toLowerCase() === f);
  }, [candidates, companyFilter]);

  const filteredProjects = useMemo(() => {
    if (companyFilter === "All") return projects;
    const f = companyFilter.trim().toLowerCase();
    return projects.filter((p) => (p.company_name || "").trim().toLowerCase() === f);
  }, [projects, companyFilter]);

  const filteredInvoices = useMemo(() => {
    if (companyFilter === "All") return invoices;
    const f = companyFilter.trim().toLowerCase();
    return invoices.filter((i) => (i.client_company || "").trim().toLowerCase() === f);
  }, [invoices, companyFilter]);

  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>
      <header className="border-b hairline sticky top-0 bg-[color:var(--cream)] z-30">
        <div className="max-w-[1200px] mx-auto px-8 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-baseline gap-2.5">
            <span className="font-serif-editorial text-[22px] leading-none">Linchub</span>
            <span className="eyebrow hidden sm:inline">Client Portal</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-[12px] font-medium">{user?.name}</div>
              <div className="text-[11px] text-[color:var(--ink-3)]">{user?.email}</div>
            </div>
            <button
              onClick={async () => { await logout(); nav("/login"); }}
              data-testid="client-logout-btn"
              className="inline-flex items-center gap-2 px-3 py-1.5 border hairline rounded-full text-[12px] font-mono-ed uppercase tracking-widest hover:bg-[color:var(--cream-2)]"
            >
              <LogOut size={12} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-8 py-12">
        <div className="eyebrow mb-2">Welcome back</div>
        <h1 className="font-serif-editorial text-[44px] leading-tight tracking-tight mb-2">
          Halo, <span className="italic">{user?.name?.split(" ")[0] || "Client"}</span>.
        </h1>
        {user?.last_login_at && (
          <p className="text-[12px] text-[color:var(--ink-3)] font-mono-ed mb-10">
            Terakhir login: {new Date(user.last_login_at).toLocaleString("id-ID")}
          </p>
        )}
        {!user?.last_login_at && <div className="mb-10" />}

        {/* Filter per project/company */}
        <div className="flex flex-wrap items-center gap-2 mb-10">
          <span className="eyebrow mr-2">Filter:</span>
          {companies.map((c) => (
            <button
              key={c}
              data-testid={`filter-company-${c.replace(/\W+/g, "-").toLowerCase()}`}
              onClick={() => setCompanyFilter(c)}
              className={`pill cursor-pointer ${companyFilter === c ? "!bg-[color:var(--ink)] !text-[color:var(--cream)] !border-[color:var(--ink)]" : "hover:bg-[color:var(--cream-2)]"}`}
            >
              <Building2 size={11} /> {c}
            </button>
          ))}
        </div>

        <section className="mb-12">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="font-serif-editorial text-[24px]">Status proyek Anda</h2>
            <span className="eyebrow">{filteredProjects.length} project</span>
          </div>
          {filteredProjects.length === 0 ? (
            <div className="paper p-8 text-center text-[13px] text-[color:var(--ink-3)]">
              Belum ada proyek untuk filter ini.
            </div>
          ) : (
            <div className="paper overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-5 py-3 text-[11px] font-mono-ed uppercase tracking-widest text-[color:var(--ink-3)] border-b hairline">
                <div className="col-span-3">Perusahaan</div>
                <div className="col-span-3">PIC</div>
                <div className="col-span-3">Tgl. Dihubungi</div>
                <div className="col-span-3">Status</div>
              </div>
              {filteredProjects.map((p) => (
                <div key={p.id} className="grid grid-cols-12 gap-4 px-5 py-4 border-b hairline text-[13px] items-center">
                  <div className="col-span-3 font-medium">{p.company_name}</div>
                  <div className="col-span-3">{p.pic_name}</div>
                  <div className="col-span-3 text-[12px]">{shortDate(p.contact_date)}</div>
                  <div className="col-span-3"><span className="pill">{p.stage}</span></div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mb-12">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="font-serif-editorial text-[24px] flex items-center gap-2"><Users size={20} /> Candidate tracking tim Anda</h2>
            <span className="eyebrow">{filteredCandidates.length} kandidat</span>
          </div>
          {filteredCandidates.length === 0 ? (
            <div className="paper p-8 text-center text-[13px] text-[color:var(--ink-3)]">Belum ada kandidat untuk filter ini.</div>
          ) : (
            <div className="paper overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-5 py-3 text-[11px] font-mono-ed uppercase tracking-widest text-[color:var(--ink-3)] border-b hairline">
                <div className="col-span-3">Kandidat</div>
                <div className="col-span-3">Posisi</div>
                <div className="col-span-3">Perusahaan</div>
                <div className="col-span-3">Stage</div>
              </div>
              {filteredCandidates.map((c) => (
                <div key={c.id} className="grid grid-cols-12 gap-4 px-5 py-4 border-b hairline text-[13px] items-center">
                  <div className="col-span-3 font-medium">{c.name}</div>
                  <div className="col-span-3 text-[12px]">{c.position}</div>
                  <div className="col-span-3 text-[12px] text-[color:var(--ink-3)]">{c.client_company}</div>
                  <div className="col-span-3">
                    <span className="pill">{STAGE_PILL[c.stage] || c.stage}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="font-serif-editorial text-[24px]">Riwayat invoice</h2>
            <span className="eyebrow">{filteredInvoices.length} invoices</span>
          </div>
          {filteredInvoices.length === 0 ? (
            <div className="paper p-8 text-center text-[13px] text-[color:var(--ink-3)]">Belum ada invoice.</div>
          ) : (
            <div className="paper overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-5 py-3 text-[11px] font-mono-ed uppercase tracking-widest text-[color:var(--ink-3)] border-b hairline">
                <div className="col-span-3">No. Invoice</div>
                <div className="col-span-3">Issue / Due</div>
                <div className="col-span-3 text-right">Total</div>
                <div className="col-span-3">Status</div>
              </div>
              {filteredInvoices.map((i) => (
                <div key={i.id} className="grid grid-cols-12 gap-4 px-5 py-4 border-b hairline text-[13px] items-center">
                  <div className="col-span-3 font-mono-ed text-[12px]">{i.invoice_no}</div>
                  <div className="col-span-3 text-[12px]">{shortDate(i.issue_date)} → {shortDate(i.due_date)}</div>
                  <div className="col-span-3 text-right font-medium">{currency(i.total)}</div>
                  <div className="col-span-3"><span className="pill">{i.status}</span></div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t hairline mt-16">
        <div className="max-w-[1200px] mx-auto px-8 py-6 text-[11px] font-mono-ed uppercase tracking-widest text-[color:var(--ink-3)]">
          PT. Linchub Network Indonesia · Confidential
        </div>
      </footer>
    </div>
  );
}

