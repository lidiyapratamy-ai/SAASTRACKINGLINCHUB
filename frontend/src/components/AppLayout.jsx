import { useState, useRef, useEffect } from "react";
import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import { ChevronDown, LogOut, KeyRound, X } from "lucide-react";

const MENUS = [
  {
    key: "project",
    label: "Project",
    items: [
      { to: "/app/project", label: "Create Project (Lead Input)" },
      { to: "/app/project/analyst", label: "Analyst (Project)" },
    ],
  },
  {
    key: "candidate",
    label: "Candidate",
    items: [
      { to: "/app/candidate/interview", label: "Stage 1 – 2 (Interview Klien)" },
      { to: "/app/candidate/ojt", label: "Stage OJT (14 Hari Kerja)" },
      { to: "/app/candidate/pkwt", label: "Stage PKWT & Offering" },
    ],
  },
  {
    key: "billing",
    label: "Billing",
    items: [
      { to: "/app/billing/pricing", label: "Master Pricing & Custom Rate" },
      { to: "/app/billing/invoices", label: "Create & Manage Invoices" },
      { to: "/app/billing/cashflow", label: "Billing Analyst & Cashflow" },
    ],
  },
  { key: "analyst", label: "Analyst", to: "/app/analyst" },
  { key: "settings", label: "Settings", to: "/app/settings" },
];

function DropMenu({ menu }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (menu.to) {
    return (
      <NavLink
        to={menu.to}
        data-testid={`nav-${menu.key}`}
        className={({ isActive }) =>
          `link-quiet text-[13px] tracking-wide uppercase font-mono-ed px-1 ${isActive ? "text-[color:var(--ink)]" : "text-[color:var(--ink-3)] hover:text-[color:var(--ink)]"}`
        }
      >
        {menu.label}
      </NavLink>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        data-testid={`nav-${menu.key}-toggle`}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-[13px] tracking-wide uppercase font-mono-ed text-[color:var(--ink-3)] hover:text-[color:var(--ink)]"
      >
        {menu.label}
        <ChevronDown size={13} className={`chev ${open ? "chev-open" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-3 w-72 paper shadow-sm z-40 fade-up">
          <div className="p-1">
            {menu.items.map((it) => (
              <Link
                key={it.to}
                to={it.to}
                onClick={() => setOpen(false)}
                data-testid={`nav-item-${it.to.replace(/\W+/g, "-")}`}
                className="block px-3 py-2.5 text-[13px] hover:bg-[color:var(--cream-2)] rounded-sm"
              >
                {it.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppLayout({ children }) {
  const { user, logout, can } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  // Filter menus/submenus according to permissions
  const menusFiltered = MENUS
    .map((m) => {
      const modMap = { project: "Project", candidate: "Candidate", billing: "Billing", analyst: "Analyst", settings: "Settings" };
      const mod = modMap[m.key];
      if (!can(mod, "Read")) return null;
      return m;
    })
    .filter(Boolean);

  const [uOpen, setUOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ old_password: "", new_password: "", confirm: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const uRef = useRef();
  useEffect(() => {
    const h = (e) => { if (uRef.current && !uRef.current.contains(e.target)) setUOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const submitPw = async (e) => {
    e.preventDefault();
    if (pw.new_password.length < 6) { toast.error("Password baru minimal 6 karakter"); return; }
    if (pw.new_password !== pw.confirm) { toast.error("Konfirmasi password tidak cocok"); return; }
    setPwLoading(true);
    try {
      await api.post("/auth/change-password", { old_password: pw.old_password, new_password: pw.new_password });
      toast.success("Password berhasil diubah");
      setPwOpen(false); setPw({ old_password: "", new_password: "", confirm: "" });
    } catch (err) { toast.error(formatApiError(err)); }
    setPwLoading(false);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>
      <header className="border-b hairline bg-[color:var(--cream)] sticky top-0 z-30">
        <div className="max-w-[1360px] mx-auto px-8 py-4 flex items-center justify-between">
          <Link to="/app/project" className="flex items-baseline gap-2.5">
            <span className="font-serif-editorial text-[22px] leading-none">Linchub</span>
            <span className="eyebrow hidden sm:inline">Tracking SaaS</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {menusFiltered.map((m) => <DropMenu key={m.key} menu={m} />)}
          </nav>

          <div ref={uRef} className="relative">
            <button
              data-testid="user-menu-toggle"
              onClick={() => setUOpen((o) => !o)}
              className="flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-full border hairline hover:bg-[color:var(--cream-2)]"
            >
              <div className="h-6 w-6 rounded-full bg-[color:var(--ink)] text-[color:var(--cream)] grid place-items-center text-[11px] font-medium">
                {(user?.name || "U").slice(0, 1).toUpperCase()}
              </div>
              <span className="text-[12px] font-mono-ed uppercase tracking-wider">{user?.role?.replace("_", " ")}</span>
            </button>
            {uOpen && (
              <div className="absolute right-0 mt-2 w-64 paper z-40 fade-up">
                <div className="p-3 border-b hairline">
                  <div className="text-[13px] font-medium">{user?.name}</div>
                  <div className="text-[11px] text-[color:var(--ink-3)]">{user?.email}</div>
                </div>
                <button
                  data-testid="change-password-btn"
                  onClick={() => { setUOpen(false); setPwOpen(true); }}
                  className="w-full text-left px-3 py-2.5 text-[13px] hover:bg-[color:var(--cream-2)] flex items-center gap-2 border-b hairline"
                >
                  <KeyRound size={14} /> Ganti Password
                </button>
                <button
                  data-testid="logout-btn"
                  onClick={async () => { await logout(); nav("/login"); }}
                  className="w-full text-left px-3 py-2.5 text-[13px] hover:bg-[color:var(--cream-2)] flex items-center gap-2"
                >
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {pwOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 grid place-items-center p-4">
          <form onSubmit={submitPw} className="paper w-full max-w-md p-8 bg-[color:var(--cream)]" data-testid="change-password-form">
            <div className="flex items-start justify-between mb-6">
              <div><div className="eyebrow mb-1">Update credential</div><h3 className="font-serif-editorial text-[24px]">Ganti password.</h3></div>
              <button type="button" onClick={() => setPwOpen(false)}><X size={18} /></button>
            </div>
            <div className="space-y-5">
              <div><label className="eyebrow block mb-1.5">Password lama</label>
                <input type="password" required value={pw.old_password} onChange={(e) => setPw({ ...pw, old_password: e.target.value })} data-testid="pw-old" className="w-full bg-transparent border-b hairline focus:border-[color:var(--ink)] outline-none py-2 text-[14px]" /></div>
              <div><label className="eyebrow block mb-1.5">Password baru</label>
                <input type="password" required value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} data-testid="pw-new" className="w-full bg-transparent border-b hairline focus:border-[color:var(--ink)] outline-none py-2 text-[14px]" /></div>
              <div><label className="eyebrow block mb-1.5">Konfirmasi password baru</label>
                <input type="password" required value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} data-testid="pw-confirm" className="w-full bg-transparent border-b hairline focus:border-[color:var(--ink)] outline-none py-2 text-[14px]" /></div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button type="button" onClick={() => setPwOpen(false)} className="px-5 py-2.5 text-[12px] font-mono-ed uppercase tracking-widest border hairline rounded-full">Batal</button>
              <button type="submit" disabled={pwLoading} data-testid="pw-submit" className="px-5 py-2.5 text-[12px] font-mono-ed uppercase tracking-widest bg-[color:var(--ink)] text-[color:var(--cream)] rounded-full disabled:opacity-60">{pwLoading ? "Menyimpan…" : "Update Password"}</button>
            </div>
          </form>
        </div>
      )}

      <main className="max-w-[1360px] mx-auto px-8 py-10">{children}</main>

      <footer className="border-t hairline mt-16">
        <div className="max-w-[1360px] mx-auto px-8 py-6 flex items-center justify-between text-[11px] text-[color:var(--ink-3)]">
          <span className="font-mono-ed uppercase tracking-widest">PT. Linchub Network Indonesia</span>
          <span>Boutique Recruitment Ecosystem · Confidential</span>
        </div>
      </footer>
    </div>
  );
}
