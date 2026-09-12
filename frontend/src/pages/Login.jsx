import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Globe, KeyRound, Crown, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const TABS = [
  { id: "client", label: "Client Portal", icon: Globe, hint: "Pantau status rekrutmen proyek berjalan & riwayat invoice." },
  { id: "karyawan", label: "Karyawan Portal", icon: KeyRound, hint: "Operasional recruiter: pipeline, interview, pembaruan harian." },
  { id: "corporate", label: "Corporate Portal", icon: Crown, hint: "Akses penuh Super Admin — RBAC, Pricing, Analyst, Billing, Logs." },
];

const DEFAULTS = {
  client: { email: "client@linchub.id", password: "" },
  karyawan: { email: "karyawan@linchub.id", password: "" },
  corporate: { email: "lidiyapratamy@gmail.com", password: "" },
};

export default function Login() {
  const [tab, setTab] = useState("corporate");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const switchTab = (id) => {
    setTab(id);
    setEmail("");
    setPassword("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const r = await login(email, password);
    setLoading(false);
    if (r.ok) {
      toast.success(`Selamat datang, ${r.user.name}`);
      if (r.user.role === "client") nav("/client");
      else nav("/app/project");
    } else {
      toast.error(r.error || "Login gagal");
    }
  };

  const active = TABS.find((t) => t.id === tab);

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2" style={{ background: "var(--cream)" }}>
      {/* Left — brand & tabs */}
      <div className="p-10 md:p-16 border-r hairline flex flex-col">
        <Link to="/" data-testid="login-back-home" className="inline-flex items-center gap-2 text-[12px] font-mono-ed uppercase tracking-widest text-[color:var(--ink-3)] hover:text-[color:var(--ink)]">
          <ArrowLeft size={14} /> Kembali
        </Link>

        <div className="mt-14">
          <div className="eyebrow">Dynamic Login Portal Switcher</div>
          <h1 className="font-serif-editorial text-[44px] leading-[1.05] tracking-tight mt-3">
            Pilih pintu masuk<br />yang tepat.
          </h1>
          <p className="mt-4 max-w-md text-[14px] text-[color:var(--ink-2)] leading-relaxed">
            Tiga jalur portal, satu ekosistem. Tanpa demo publik, tanpa logo kaku — hanya akses yang jujur.
          </p>
        </div>

        {/* Tabs */}
        <div className="mt-14">
          <div className="flex items-center border-y hairline">
            {TABS.map((t) => {
              const isActive = tab === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  data-testid={`portal-tab-${t.id}`}
                  onClick={() => switchTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 text-[12px] font-mono-ed uppercase tracking-widest transition-colors ${
                    isActive ? "bg-[color:var(--ink)] text-[color:var(--cream)]" : "hover:bg-[color:var(--cream-2)] text-[color:var(--ink-3)]"
                  }`}
                >
                  <Icon size={14} />
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden">{t.label.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-5 text-[13px] text-[color:var(--ink-2)] leading-relaxed">
            {active.hint}
          </p>
        </div>

        <div className="mt-auto pt-16 text-[11px] font-mono-ed uppercase tracking-widest text-[color:var(--ink-3)]">
          Confidential · PT. Linchub Network Indonesia
        </div>
      </div>

      {/* Right — form */}
      <div className="p-10 md:p-16 flex items-center">
        <form onSubmit={submit} className="w-full max-w-md" data-testid="login-form">
          <div className="eyebrow mb-3">§ Access</div>
          <h2 className="font-serif-editorial text-[36px] leading-tight">Masuk ke portal.</h2>

          <div className="mt-10 space-y-6">
            <div>
              <label className="eyebrow block mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="login-email"
                required
                className="w-full bg-transparent border-b hairline focus:border-[color:var(--ink)] outline-none py-2.5 text-[15px]"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="eyebrow block mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="login-password"
                required
                className="w-full bg-transparent border-b hairline focus:border-[color:var(--ink)] outline-none py-2.5 text-[15px]"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            data-testid="login-submit"
            className="mt-10 w-full py-3.5 rounded-full bg-[color:var(--ink)] text-[color:var(--cream)] hover:bg-[color:var(--ink-2)] disabled:opacity-60 text-[13px] font-mono-ed uppercase tracking-widest"
          >
            {loading ? "Memverifikasi…" : "Enter Portal"}
          </button>

          {tab === "corporate" && (
            <div className="mt-8 p-4 paper-2 text-[12px] text-[color:var(--ink-2)] leading-relaxed">
              <div className="eyebrow mb-2">Portal Notice</div>
              Portal Super Admin diakses menggunakan kredensial yang telah diberikan.
              Klien tidak diberikan akses ke portal ini.
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
