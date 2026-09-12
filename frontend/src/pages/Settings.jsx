import { useEffect, useState } from "react";
import { api, formatApiError, shortDate } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

const ROLES = ["super_admin", "karyawan", "client"];
const MODULES = ["Project", "Candidate", "Billing", "Analyst", "Settings"];
const PERMS = ["Read", "Write", "Delete"];

const defaultRBAC = () => {
  const m = {};
  ROLES.forEach((r) => {
    m[r] = {};
    MODULES.forEach((mod) => {
      m[r][mod] = { Read: r === "client" ? mod !== "Settings" : true, Write: r !== "client", Delete: r === "super_admin" };
    });
  });
  return m;
};

const TABS = [
  { id: "rbac", label: "Role & Access Management" },
  { id: "users", label: "Users & Client Access" },
  { id: "brand", label: "Global Invoice Branding" },
  { id: "logs", label: "System Logs & Audit" },
  { id: "notif", label: "Integration & Notification Rules" },
];

export default function Settings() {
  const { refreshPerms } = useAuth();
  const [tab, setTab] = useState("rbac");
  const [s, setS] = useState({ rbac: defaultRBAC(), rules: [] });
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api.get("/settings").then(({ data }) => setS({ ...data, rbac: Object.keys(data.rbac || {}).length ? data.rbac : defaultRBAC(), rules: data.rules || [] }));
    api.get("/audit-logs").then(({ data }) => setLogs(data)).catch(() => {});
    api.get("/users").then(({ data }) => setUsers(data)).catch(() => {});
  }, []);

  const save = async () => {
    try { const { data } = await api.put("/settings", s); setS({ ...data, rbac: data.rbac || defaultRBAC(), rules: data.rules || [] }); toast.success("Settings tersimpan · matrix aktif real-time"); refreshPerms && refreshPerms(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div>
      <div className="eyebrow mb-2">Settings</div>
      <h1 className="font-serif-editorial text-[40px] leading-tight tracking-tight mb-8">Central control.</h1>

      <div className="flex items-center border-y hairline mb-8">
        {TABS.map((t) => <button key={t.id} onClick={() => setTab(t.id)} data-testid={`settings-tab-${t.id}`} className={`px-5 py-3 text-[12px] font-mono-ed uppercase tracking-widest ${tab === t.id ? "bg-[color:var(--ink)] text-[color:var(--cream)]" : "text-[color:var(--ink-3)] hover:text-[color:var(--ink)]"}`}>{t.label}</button>)}
      </div>

      {tab === "rbac" && (
        <div className="paper p-6">
          <div className="eyebrow mb-4">Permission matrix</div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead><tr><th className="text-left py-2 eyebrow">Module</th>{ROLES.map((r) => <th key={r} colSpan={3} className="text-center py-2 eyebrow border-l hairline">{r.replace("_", " ")}</th>)}</tr>
                <tr><th></th>{ROLES.flatMap((r) => PERMS.map((p) => <th key={r + p} className="eyebrow py-1 border-l hairline">{p}</th>))}</tr></thead>
              <tbody>{MODULES.map((mod) => (
                <tr key={mod} className="border-t hairline"><td className="py-3 font-medium">{mod}</td>
                  {ROLES.flatMap((r) => PERMS.map((p) => (
                    <td key={r + mod + p} className="text-center py-3 border-l hairline">
                      <input type="checkbox" checked={!!s.rbac?.[r]?.[mod]?.[p]} onChange={(e) => { const rbac = { ...s.rbac }; if (!rbac[r]) rbac[r] = {}; if (!rbac[r][mod]) rbac[r][mod] = {}; rbac[r][mod][p] = e.target.checked; setS({ ...s, rbac }); }} />
                    </td>
                  )))}
                </tr>))}</tbody>
            </table>
          </div>
          <div className="mt-6 flex justify-end"><button onClick={save} className="px-5 py-2.5 text-[12px] font-mono-ed uppercase tracking-widest bg-[color:var(--ink)] text-[color:var(--cream)] rounded-full">Save Matrix</button></div>
        </div>
      )}

      {tab === "brand" && (
        <div className="paper p-6 space-y-5 max-w-2xl">
          <div><label className="eyebrow block mb-1.5">Nama Perusahaan</label><input value={s.company_name || ""} onChange={(e) => setS({ ...s, company_name: e.target.value })} className="w-full bg-transparent border-b hairline outline-none py-2 text-[14px]" /></div>
          <div><label className="eyebrow block mb-1.5">Prefix Invoice</label><input value={s.invoice_prefix || ""} onChange={(e) => setS({ ...s, invoice_prefix: e.target.value })} className="w-full bg-transparent border-b hairline outline-none py-2 text-[14px]" /></div>
          {[["letterhead_url", "Kop Surat (PNG/SVG transparent)"], ["stamp_url", "Stempel Perusahaan (PNG transparent)"], ["signature_url", "Tanda Tangan Digital (PNG transparent)"]].map(([k, l]) => (
            <div key={k} className="pt-4 border-t hairline">
              <label className="eyebrow block mb-2">{l}</label>
              <div className="flex items-start gap-4">
                <div className="flex-1 space-y-2">
                  <input
                    type="file"
                    accept="image/png,image/svg+xml,image/jpeg"
                    data-testid={`upload-${k}`}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) { toast.error("Maks 2MB"); return; }
                      const reader = new FileReader();
                      reader.onload = () => setS((prev) => ({ ...prev, [k]: reader.result }));
                      reader.readAsDataURL(file);
                    }}
                    className="block text-[12px] file:mr-3 file:py-2 file:px-4 file:rounded-full file:border file:hairline file:bg-[color:var(--cream-2)] file:text-[11px] file:font-mono-ed file:uppercase file:tracking-widest file:cursor-pointer"
                  />
                  <input value={s[k] || ""} onChange={(e) => setS({ ...s, [k]: e.target.value })} placeholder="atau paste URL…" className="w-full bg-transparent border-b hairline outline-none py-1.5 text-[12px]" />
                  <div className="text-[11px] text-[color:var(--ink-3)]">Upload file dari komputer (maks 2MB) atau paste URL.</div>
                </div>
                {s[k] && (
                  <div className="paper-2 p-3 w-40 h-24 grid place-items-center relative">
                    <img src={s[k]} alt="" className="max-h-full max-w-full object-contain" />
                    <button onClick={() => setS({ ...s, [k]: "" })} className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-[color:var(--ink)] text-[color:var(--cream)] text-[11px]">×</button>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div className="pt-3"><button onClick={save} data-testid="save-branding" className="px-5 py-2.5 text-[12px] font-mono-ed uppercase tracking-widest bg-[color:var(--ink)] text-[color:var(--cream)] rounded-full">Save Branding</button></div>
        </div>
      )}

      {tab === "users" && (
        <div className="paper overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-5 py-3 text-[11px] font-mono-ed uppercase tracking-widest text-[color:var(--ink-3)] border-b hairline">
            <div className="col-span-2">Nama</div>
            <div className="col-span-3">Email</div>
            <div className="col-span-1">Role</div>
            <div className="col-span-2">Tenant</div>
            <div className="col-span-2">Last Login</div>
            <div className="col-span-2">IP Terakhir</div>
          </div>
          {users.length === 0 ? (
            <div className="px-5 py-16 text-center text-[color:var(--ink-3)] text-[13px]">Belum ada user.</div>
          ) : (
            users.map((u) => (
              <div key={u.id} className="grid grid-cols-12 gap-3 px-5 py-3 border-b hairline text-[13px] items-center" data-testid={`user-row-${u.id}`}>
                <div className="col-span-2 font-medium">{u.name}</div>
                <div className="col-span-3 font-mono-ed text-[12px] truncate">{u.email}</div>
                <div className="col-span-1"><span className="pill">{u.role?.replace("_", " ")}</span></div>
                <div className="col-span-2 text-[12px] text-[color:var(--ink-3)] truncate">{u.tenant_company || "—"}</div>
                <div className="col-span-2 text-[12px]">{u.last_login_at ? new Date(u.last_login_at).toLocaleString("id-ID") : "Belum pernah"}</div>
                <div className="col-span-2 font-mono-ed text-[11px] text-[color:var(--ink-3)]">{u.last_login_ip || "—"}</div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "logs" && (
        <div className="paper overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-5 py-3 text-[11px] font-mono-ed uppercase tracking-widest text-[color:var(--ink-3)] border-b hairline">
            <div className="col-span-3">Timestamp</div><div className="col-span-2">User</div><div className="col-span-2">Action</div><div className="col-span-2">Entity</div><div className="col-span-3">Entity ID</div>
          </div>
          {logs.length === 0 ? <div className="px-5 py-16 text-center text-[color:var(--ink-3)] text-[13px]">Belum ada audit trail.</div> :
            logs.map((l) => (
              <div key={l.id} className="grid grid-cols-12 gap-3 px-5 py-3 border-b hairline text-[12px] font-mono-ed items-center">
                <div className="col-span-3">{new Date(l.at).toLocaleString("id-ID")}</div>
                <div className="col-span-2 truncate">{l.user_email}</div>
                <div className="col-span-2">
                  <span className="pill">{l.action}</span>
                  {l.action === "client_login" && l.after?.ip && (
                    <div className="text-[10px] text-[color:var(--ink-3)] mt-1">IP {l.after.ip}</div>
                  )}
                </div>
                <div className="col-span-2">{l.entity}</div>
                <div className="col-span-3 text-[color:var(--ink-3)] truncate">{l.entity_id}</div>
              </div>
            ))}
        </div>
      )}

      {tab === "notif" && (
        <div className="space-y-5 max-w-2xl">
          <div className="paper p-6 space-y-5">
            <div className="flex items-baseline justify-between"><div className="eyebrow">Integration channels</div><span className="pill">Mocked · placeholder</span></div>
            {[["wa_api_key", "WhatsApp API Key", "Pengingat invoice overdue & status kandidat"], ["email_gateway", "Email Gateway (SMTP / API)", "Invoice PDF & laporan berkala"], ["slack_webhook", "Slack / Teams Webhook", "Notifikasi tim saat kandidat lulus OJT"]].map(([k, l, hint]) => (
              <div key={k}>
                <label className="eyebrow block mb-1.5">{l}</label>
                <input value={s[k] || ""} onChange={(e) => setS({ ...s, [k]: e.target.value })} placeholder="Paste key / webhook URL…" className="w-full bg-transparent border-b hairline outline-none py-2 text-[14px]" />
                <div className="text-[11px] text-[color:var(--ink-3)] mt-1">{hint}</div>
              </div>
            ))}
          </div>
          <div className="paper p-6">
            <div className="eyebrow mb-3">Trigger rules engine</div>
            {(s.rules || []).map((r, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center mb-2">
                <input placeholder="Kondisi (mis. Invoice Overdue H+3)" value={r.condition || ""} onChange={(e) => { const rules = [...s.rules]; rules[i].condition = e.target.value; setS({ ...s, rules }); }} className="col-span-6 bg-transparent border-b hairline outline-none py-2 text-[13px]" />
                <input placeholder="Aksi (mis. Kirim WA + Email)" value={r.action || ""} onChange={(e) => { const rules = [...s.rules]; rules[i].action = e.target.value; setS({ ...s, rules }); }} className="col-span-5 bg-transparent border-b hairline outline-none py-2 text-[13px]" />
                <button onClick={() => setS({ ...s, rules: s.rules.filter((_, x) => x !== i) })} className="col-span-1 text-[color:var(--ink-3)]">×</button>
              </div>
            ))}
            <button onClick={() => setS({ ...s, rules: [...(s.rules || []), { condition: "", action: "" }] })} className="text-[11px] font-mono-ed uppercase tracking-widest link-quiet">+ Tambah aturan</button>
          </div>
          <div><button onClick={save} className="px-5 py-2.5 text-[12px] font-mono-ed uppercase tracking-widest bg-[color:var(--ink)] text-[color:var(--cream)] rounded-full">Save Integrations</button></div>
        </div>
      )}
    </div>
  );
}
