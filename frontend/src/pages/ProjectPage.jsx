import { useEffect, useState, useMemo } from "react";
import { api, formatApiError, shortDate } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Plus, X, LayoutGrid, List, Search, Archive, Upload, Download, KeyRound, Copy, RefreshCw } from "lucide-react";

const STAGES = ["Contacted", "Meeting CR", "Finishing Meeting", "Proposal", "Closed/Deal"];

const empty = {
  pic_name: "", whatsapp: "", email: "", company_name: "", website: "",
  contact_date: "", stage: "Contacted", notes: "",
};

export default function ProjectPage() {
  const { can, user } = useAuth();
  const isAdmin = user?.role === "super_admin";
  const [items, setItems] = useState([]);
  const [view, setView] = useState("list");
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [tab, setTab] = useState("active"); // active | archive
  const [credModal, setCredModal] = useState(null);

  const load = async () => {
    try { const { data } = await api.get("/projects"); setItems(data); }
    catch (e) { toast.error(formatApiError(e)); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const cur = new Date();
    const list = items.filter((p) => {
      const d = p.contact_date ? new Date(p.contact_date) : null;
      const isArchive = d && (d.getMonth() !== cur.getMonth() || d.getFullYear() !== cur.getFullYear());
      if (tab === "archive") return isArchive;
      if (tab === "active") return !isArchive;
      return true;
    });
    if (!q) return list;
    const s = q.toLowerCase();
    return list.filter((p) => JSON.stringify(p).toLowerCase().includes(s));
  }, [items, q, tab]);

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/projects/${editing}`, form);
      else await api.post("/projects", form);
      toast.success("Lead tersimpan");
      setShowForm(false); setForm(empty); setEditing(null);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const del = async (id) => {
    if (!confirm("Hapus lead ini?")) return;
    try { await api.delete(`/projects/${id}`); toast.success("Terhapus"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  const startEdit = (p) => { setEditing(p.id); setForm({ ...empty, ...p }); setShowForm(true); };

  const viewCred = async (p) => {
    try {
      const { data } = await api.get(`/projects/${p.id}/credentials`);
      setCredModal({ project: p, cred: data, isNew: false });
    } catch (e) {
      if (e?.response?.status === 404) {
        // Auto regenerate
        if (!confirm(`Belum ada kredensial untuk ${p.company_name}. Buat sekarang?`)) return;
        try {
          const { data } = await api.post(`/projects/${p.id}/regenerate-credentials`);
          setCredModal({ project: p, cred: data, isNew: true });
        } catch (err) { toast.error(formatApiError(err)); }
      } else {
        toast.error(formatApiError(e));
      }
    }
  };

  const regenCred = async () => {
    if (!credModal) return;
    if (!confirm("Regenerate password? Password lama tidak akan berlaku lagi.")) return;
    try {
      const { data } = await api.post(`/projects/${credModal.project.id}/regenerate-credentials`);
      setCredModal({ ...credModal, cred: data, isNew: true });
      toast.success("Password baru dibuat");
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const copyCred = (text) => { navigator.clipboard.writeText(text); toast.success("Tersalin"); };

  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (!lines.length) return [];
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase().replace(/\s+/g, "_"));
    return lines.slice(1).map((line) => {
      // Parse CSV respecting quoted fields
      const cells = [];
      let cur = ""; let q = false;
      for (const ch of line) {
        if (ch === '"') { q = !q; continue; }
        if (ch === "," && !q) { cells.push(cur); cur = ""; continue; }
        cur += ch;
      }
      cells.push(cur);
      const row = {};
      headers.forEach((h, i) => { row[h] = (cells[i] || "").trim(); });
      return row;
    });
  };

  const handleCSVImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    let rows;
    const isExcel = /\.(xlsx|xls)$/i.test(file.name);
    if (isExcel) {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      rows = raw.map((r) => {
        const out = {};
        Object.entries(r).forEach(([k, v]) => { out[String(k).trim().toLowerCase().replace(/\s+/g, "_")] = String(v).trim(); });
        return out;
      });
    } else {
      const text = await file.text();
      rows = parseCSV(text);
    }
    if (!rows.length) { toast.error("File kosong"); return; }
    const items = rows.map((r) => ({
      pic_name: r.pic_name || r.pic || r.nama_pic || "",
      whatsapp: r.whatsapp || r.wa || r.phone || "",
      email: r.email || "",
      company_name: r.company_name || r.company || r.perusahaan || r.nama_perusahaan || "",
      website: r.website || "",
      contact_date: r.contact_date || r.tanggal || "",
      stage: r.stage || "Contacted",
      notes: r.notes || r.catatan || "",
    })).filter((i) => i.company_name || i.pic_name);
    if (!items.length) { toast.error("Tidak ada baris valid (perlu kolom company_name atau pic_name)"); return; }
    try {
      const { data } = await api.post("/projects/bulk", { items });
      toast.success(`${data.created} lead diimpor dari ${isExcel ? "Excel" : "CSV"}`);
      load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const downloadTemplate = () => {
    const headers = ["pic_name", "whatsapp", "email", "company_name", "website", "contact_date", "stage", "notes"];
    const sample = ["Andi", "081234567890", "andi@acme.com", "PT Acme", "https://acme.com", "2026-02-13", "Contacted", "Referral"];
    const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, "linchub-lead-template.xlsx");
  };

  const moveStage = async (p, stage) => {
    try { await api.put(`/projects/${p.id}`, { ...p, stage }); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="eyebrow mb-2">Project · Create Project (Lead Input)</div>
          <h1 className="font-serif-editorial text-[40px] leading-tight tracking-tight">Lead pipeline.</h1>
        </div>
        <div className="flex items-center gap-2">
          {can("Project", "Write") && (
            <>
              <label data-testid="import-csv-btn" className="cursor-pointer inline-flex items-center gap-2 pl-4 pr-3 py-2.5 rounded-full border hairline hover:bg-[color:var(--cream-2)] text-[12px] font-mono-ed uppercase tracking-widest">
                <Upload size={14} /> Import CSV / Excel
                <input type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={handleCSVImport} />
              </label>
              <button onClick={downloadTemplate} className="inline-flex items-center gap-2 pl-4 pr-3 py-2.5 rounded-full border hairline hover:bg-[color:var(--cream-2)] text-[12px] font-mono-ed uppercase tracking-widest">
                <Download size={14} /> Template
              </button>
              <button
                data-testid="new-lead-btn"
                onClick={() => { setEditing(null); setForm(empty); setShowForm(true); }}
                className="inline-flex items-center gap-2 pl-4 pr-3 py-2.5 rounded-full bg-[color:var(--ink)] text-[color:var(--cream)] hover:bg-[color:var(--ink-2)] text-[12px] font-mono-ed uppercase tracking-widest"
              >
                <Plus size={14} /> New Lead
              </button>
            </>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="inline-flex border hairline rounded-full overflow-hidden">
          <button data-testid="tab-active" onClick={() => setTab("active")} className={`px-4 py-2 text-[12px] font-mono-ed uppercase tracking-widest ${tab === "active" ? "bg-[color:var(--ink)] text-[color:var(--cream)]" : "hover:bg-[color:var(--cream-2)]"}`}>Active</button>
          <button data-testid="tab-archive" onClick={() => setTab("archive")} className={`px-4 py-2 text-[12px] font-mono-ed uppercase tracking-widest flex items-center gap-1.5 ${tab === "archive" ? "bg-[color:var(--ink)] text-[color:var(--cream)]" : "hover:bg-[color:var(--cream-2)]"}`}><Archive size={12} /> Archive</button>
        </div>
        <div className="inline-flex border hairline rounded-full overflow-hidden">
          <button onClick={() => setView("list")} className={`px-3 py-2 ${view === "list" ? "bg-[color:var(--ink)] text-[color:var(--cream)]" : "hover:bg-[color:var(--cream-2)]"}`}><List size={14} /></button>
          <button onClick={() => setView("kanban")} className={`px-3 py-2 ${view === "kanban" ? "bg-[color:var(--ink)] text-[color:var(--cream)]" : "hover:bg-[color:var(--cream-2)]"}`}><LayoutGrid size={14} /></button>
        </div>
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--ink-3)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama PIC, perusahaan…"
            className="w-full pl-9 pr-3 py-2 border hairline rounded-full bg-transparent text-[13px] outline-none focus:border-[color:var(--ink)]"
            data-testid="search-projects" />
        </div>
        <span className="ml-auto text-[11px] font-mono-ed uppercase tracking-widest text-[color:var(--ink-3)]">{filtered.length} entries</span>
      </div>

      {view === "list" ? (
        <div className="paper overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-5 py-3 text-[11px] font-mono-ed uppercase tracking-widest text-[color:var(--ink-3)] border-b hairline">
            <div className="col-span-3">PIC / Company</div>
            <div className="col-span-2">Contact</div>
            <div className="col-span-2">Website</div>
            <div className="col-span-2">Tanggal</div>
            <div className="col-span-2">Stage</div>
            <div className="col-span-1 text-right">Aksi</div>
          </div>
          {filtered.length === 0 ? (
            <div className="px-5 py-16 text-center text-[color:var(--ink-3)] text-[13px]">Belum ada lead. Klik <em>New Lead</em>.</div>
          ) : filtered.map((p) => (
            <div key={p.id} className="grid grid-cols-12 gap-4 px-5 py-4 border-b hairline items-center hover:bg-[color:var(--cream-2)] text-[13px]" data-testid={`project-row-${p.id}`}>
              <div className="col-span-3">
                <div className="font-medium">{p.pic_name}</div>
                <div className="text-[12px] text-[color:var(--ink-3)]">{p.company_name}</div>
              </div>
              <div className="col-span-2 text-[12px]">
                <div>{p.whatsapp}</div>
                <div className="text-[color:var(--ink-3)]">{p.email}</div>
              </div>
              <div className="col-span-2 text-[12px] truncate">{p.website}</div>
              <div className="col-span-2 text-[12px]">{shortDate(p.contact_date)}</div>
              <div className="col-span-2">
                <select value={p.stage} onChange={(e) => moveStage(p, e.target.value)}
                  className="text-[12px] bg-transparent border hairline rounded-full px-3 py-1 outline-none">
                  {STAGES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-span-1 flex justify-end gap-2">
                {isAdmin && (
                  <button onClick={() => viewCred(p)} data-testid={`view-cred-${p.id}`} className="text-[11px] font-mono-ed uppercase tracking-widest link-quiet flex items-center gap-1" title="View Client Credentials">
                    <KeyRound size={11} /> Cred
                  </button>
                )}
                {can("Project", "Write") && <button onClick={() => startEdit(p)} className="text-[11px] font-mono-ed uppercase tracking-widest link-quiet">Edit</button>}
                {can("Project", "Delete") && <button onClick={() => del(p.id)} className="text-[11px] font-mono-ed uppercase tracking-widest link-quiet text-[color:var(--destructive)]">Del</button>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="paper overflow-x-auto">
          <div className="grid grid-cols-5 min-w-[900px]">
            {STAGES.map((s) => (
              <div key={s} className="kanban-col p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="eyebrow">{s}</span>
                  <span className="text-[11px] text-[color:var(--ink-3)]">{filtered.filter((p) => p.stage === s).length}</span>
                </div>
                <div className="space-y-3">
                  {filtered.filter((p) => p.stage === s).map((p) => (
                    <div key={p.id} className="paper-2 p-3 cursor-pointer hover:border-[color:var(--ink)]" onClick={() => startEdit(p)}>
                      <div className="text-[13px] font-medium">{p.company_name}</div>
                      <div className="text-[11px] text-[color:var(--ink-3)] mt-0.5">{p.pic_name}</div>
                      <div className="text-[11px] text-[color:var(--ink-3)] mt-2 font-mono-ed">{shortDate(p.contact_date)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Credential Modal */}
      {credModal && (
        <div className="fixed inset-0 z-50 bg-black/30 grid place-items-center p-4">
          <div className="paper w-full max-w-md p-8 bg-[color:var(--cream)]">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="eyebrow mb-1">Client Portal Credential</div>
                <h3 className="font-serif-editorial text-[24px]">{credModal.project.company_name}</h3>
                <div className="text-[11px] text-[color:var(--ink-3)] mt-1 font-mono-ed">Berikan ini ke klien secara privat</div>
              </div>
              <button onClick={() => setCredModal(null)}><X size={18} /></button>
            </div>

            {credModal.isNew && (
              <div className="mb-4 p-3 paper-2 text-[12px] leading-relaxed border-l-2" style={{ borderLeftColor: "var(--emerald)" }}>
                <div className="eyebrow mb-1" style={{ color: "var(--emerald)" }}>New credentials</div>
                Password ini hanya ditampilkan sekarang. Salin & kirim ke klien.
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="eyebrow block mb-1.5">Email (Username)</label>
                <div className="flex items-center gap-2">
                  <input readOnly value={credModal.cred.email} data-testid="cred-email" className="flex-1 bg-transparent border-b hairline outline-none py-2 text-[14px] font-mono-ed" />
                  <button onClick={() => copyCred(credModal.cred.email)} className="p-2 hover:bg-[color:var(--cream-2)] rounded" title="Copy"><Copy size={14} /></button>
                </div>
              </div>
              <div>
                <label className="eyebrow block mb-1.5">Password</label>
                <div className="flex items-center gap-2">
                  <input readOnly value={credModal.cred.password} data-testid="cred-password" className="flex-1 bg-transparent border-b hairline outline-none py-2 text-[14px] font-mono-ed" />
                  <button onClick={() => copyCred(credModal.cred.password)} className="p-2 hover:bg-[color:var(--cream-2)] rounded" title="Copy"><Copy size={14} /></button>
                </div>
              </div>
              <div>
                <label className="eyebrow block mb-1.5">Client Portal Link</label>
                <div className="flex items-center gap-2">
                  <input readOnly value={`${window.location.origin}/login`} className="flex-1 bg-transparent border-b hairline outline-none py-2 text-[12px] font-mono-ed" />
                  <button onClick={() => copyCred(`${window.location.origin}/login`)} className="p-2 hover:bg-[color:var(--cream-2)] rounded" title="Copy"><Copy size={14} /></button>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-between items-center">
              <button onClick={regenCred} data-testid="regen-cred" className="inline-flex items-center gap-2 text-[11px] font-mono-ed uppercase tracking-widest link-quiet"><RefreshCw size={12} /> Regenerate</button>
              <button
                onClick={() => copyCred(`Portal: ${window.location.origin}/login\nEmail: ${credModal.cred.email}\nPassword: ${credModal.cred.password}`)}
                className="px-5 py-2.5 text-[12px] font-mono-ed uppercase tracking-widest bg-[color:var(--ink)] text-[color:var(--cream)] rounded-full flex items-center gap-2"
              >
                <Copy size={12} /> Copy semua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/30 grid place-items-center p-4">
          <form onSubmit={save} className="paper w-full max-w-2xl p-8 bg-[color:var(--cream)]" data-testid="lead-form">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="eyebrow mb-1">{editing ? "Edit lead" : "New lead"}</div>
                <h3 className="font-serif-editorial text-[26px]">Data calon klien.</h3>
              </div>
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="p-1"><X size={18} /></button>
            </div>

            <div className="grid grid-cols-2 gap-5">
              {[
                ["pic_name", "Nama PIC", "text"],
                ["company_name", "Nama Perusahaan", "text"],
                ["whatsapp", "Nomor WhatsApp", "text"],
                ["email", "Email", "email"],
                ["website", "Website Perusahaan", "text"],
                ["contact_date", "Tanggal Dihubungi", "date"],
              ].map(([k, l, t]) => (
                <div key={k} className={k === "notes" ? "col-span-2" : ""}>
                  <label className="eyebrow block mb-1.5">{l}</label>
                  <input type={t} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    className="w-full bg-transparent border-b hairline focus:border-[color:var(--ink)] outline-none py-2 text-[14px]" />
                </div>
              ))}
              <div>
                <label className="eyebrow block mb-1.5">Stage</label>
                <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}
                  className="w-full bg-transparent border-b hairline focus:border-[color:var(--ink)] outline-none py-2 text-[14px]">
                  {STAGES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="eyebrow block mb-1.5">Catatan</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="w-full bg-transparent border-b hairline focus:border-[color:var(--ink)] outline-none py-2 text-[14px]" />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="px-5 py-2.5 text-[12px] font-mono-ed uppercase tracking-widest border hairline rounded-full">Cancel</button>
              <button type="submit" data-testid="submit-lead" className="px-5 py-2.5 text-[12px] font-mono-ed uppercase tracking-widest bg-[color:var(--ink)] text-[color:var(--cream)] rounded-full hover:bg-[color:var(--ink-2)]">Simpan</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
