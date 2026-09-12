import { useEffect, useMemo, useState } from "react";
import { api, formatApiError, shortDate, currency } from "../lib/api";
import { toast } from "sonner";
import { X } from "lucide-react";

function daysBetween(a, b) { if (!a || !b) return 0; return Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000)); }
function daysElapsed(a) { if (!a) return 0; return Math.max(0, Math.round((new Date() - new Date(a)) / 86400000)); }

export default function CandidateOJT() {
  const [items, setItems] = useState([]);
  const [drawer, setDrawer] = useState(null);
  const [entry, setEntry] = useState({ entry_date: new Date().toISOString().slice(0, 10), label: "", amount: 0 });

  const load = () => api.get("/candidates").then(({ data }) => setItems(data.filter((c) => c.stage === "OJT")));
  useEffect(load, []);

  const stats = useMemo(() => {
    const total = items.length;
    const passed = items.filter((c) => c.ojt_status === "Passed / Graduated").length;
    return { total, passed, rate: total ? Math.round((passed / total) * 100) : 0 };
  }, [items]);

  const addEntry = async (e) => {
    e.preventDefault();
    try { await api.post(`/candidates/${drawer.id}/progress`, entry); toast.success("Progress ditambahkan"); setEntry({ entry_date: new Date().toISOString().slice(0, 10), label: "", amount: 0 }); load(); const { data } = await api.get("/candidates"); setDrawer(data.find((c) => c.id === drawer.id)); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  const setStatus = async (c, status) => { try { await api.put(`/candidates/${c.id}`, { ...c, ojt_status: status }); load(); } catch (e) { toast.error(formatApiError(e)); } };
  const promote = async (c) => { try { await api.put(`/candidates/${c.id}`, { ...c, stage: "PKWT", pkwt_start: new Date().toISOString().slice(0, 10), pkwt_end: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) }); toast.success("Promosi ke PKWT"); load(); } catch (e) { toast.error(formatApiError(e)); } };

  return (
    <div>
      <div className="eyebrow mb-2">Candidate · Stage OJT (14 Hari Kerja) · List & Tracking</div>
      <h1 className="font-serif-editorial text-[40px] leading-tight tracking-tight mb-8">OJT tracking.</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="paper p-6"><div className="eyebrow mb-2">Total OJT</div><div className="font-serif-editorial text-[38px]">{stats.total}</div></div>
        <div className="paper p-6"><div className="eyebrow mb-2">Graduated</div><div className="font-serif-editorial text-[38px]">{stats.passed}</div></div>
        <div className="paper p-6"><div className="eyebrow mb-2">Achievement Rate</div><div className="font-serif-editorial text-[38px]">{stats.rate}%</div></div>
      </div>

      <div className="paper overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-5 py-3 text-[11px] font-mono-ed uppercase tracking-widest text-[color:var(--ink-3)] border-b hairline">
          <div className="col-span-2">Kandidat</div><div className="col-span-2">Klien</div><div className="col-span-2">Periode</div>
          <div className="col-span-2">Progress</div><div className="col-span-2">Target / Achieved</div><div className="col-span-2 text-right">Aksi</div>
        </div>
        {items.length === 0 ? <div className="px-5 py-16 text-center text-[color:var(--ink-3)] text-[13px]">Belum ada kandidat OJT.</div> :
          items.map((c) => {
            const total = daysBetween(c.ojt_start, c.ojt_end) || 14;
            const elapsed = Math.min(total, daysElapsed(c.ojt_start));
            const pct = Math.round((elapsed / total) * 100);
            const achieved = c.achieved || 0;
            const gap = achieved - (c.ojt_target_value || 0);
            return (
              <div key={c.id} className="grid grid-cols-12 gap-4 px-5 py-4 border-b hairline text-[13px] items-center">
                <div className="col-span-2 font-medium">{c.name}</div>
                <div className="col-span-2">{c.client_company}</div>
                <div className="col-span-2 text-[12px]">{shortDate(c.ojt_start)} — {shortDate(c.ojt_end)}</div>
                <div className="col-span-2">
                  <div className="flex items-center justify-between text-[11px] mb-1 font-mono-ed"><span>Day {elapsed}/{total}</span><span>{pct}%</span></div>
                  <div className="h-1.5 bg-[color:var(--cream-3)] rounded-full overflow-hidden"><div className="h-full bg-[color:var(--emerald)]" style={{ width: `${pct}%` }} /></div>
                </div>
                <div className="col-span-2 text-[12px]">
                  <div>{c.ojt_target_type === "Revenue" ? currency(achieved) : achieved} / {c.ojt_target_type === "Revenue" ? currency(c.ojt_target_value) : c.ojt_target_value}</div>
                  <div className={`text-[11px] font-mono-ed ${gap >= 0 ? "text-[color:var(--emerald)]" : "text-[color:var(--destructive)]"}`}>Gap: {gap >= 0 ? "+" : ""}{gap}</div>
                </div>
                <div className="col-span-2 flex justify-end gap-2">
                  <button onClick={() => setDrawer(c)} className="text-[11px] font-mono-ed uppercase tracking-widest link-quiet">Customize</button>
                  <button onClick={() => promote(c)} className="text-[11px] font-mono-ed uppercase tracking-widest link-quiet">→ PKWT</button>
                </div>
              </div>
            );
          })}
      </div>

      {drawer && (
        <div className="fixed inset-0 z-50 bg-black/30 flex justify-end">
          <div className="w-full max-w-lg h-full bg-[color:var(--cream)] p-8 overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div><div className="eyebrow mb-1">Customize Progress · OJT</div><h3 className="font-serif-editorial text-[24px]">{drawer.name}</h3><div className="text-[12px] text-[color:var(--ink-3)] mt-1">{drawer.client_company}</div></div>
              <button onClick={() => setDrawer(null)}><X size={18} /></button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div><label className="eyebrow block mb-1.5">Target Type</label>
                <select value={drawer.ojt_target_type} onChange={async (e) => { const v = e.target.value; await api.put(`/candidates/${drawer.id}`, { ...drawer, ojt_target_type: v }); setDrawer({ ...drawer, ojt_target_type: v }); load(); }} className="w-full bg-transparent border-b hairline outline-none py-2 text-[14px]">
                  <option>Quantity</option><option>Revenue</option>
                </select>
              </div>
              <div><label className="eyebrow block mb-1.5">Target Value</label>
                <input type="number" value={drawer.ojt_target_value} onBlur={async (e) => { await api.put(`/candidates/${drawer.id}`, { ...drawer, ojt_target_value: parseFloat(e.target.value) }); load(); }} onChange={(e) => setDrawer({ ...drawer, ojt_target_value: parseFloat(e.target.value) || 0 })} className="w-full bg-transparent border-b hairline outline-none py-2 text-[14px]" /></div>
              <div><label className="eyebrow block mb-1.5">Status Kelulusan</label>
                <select value={drawer.ojt_status} onChange={async (e) => { const v = e.target.value; setDrawer({ ...drawer, ojt_status: v }); setStatus(drawer, v); }} className="w-full bg-transparent border-b hairline outline-none py-2 text-[14px]">
                  <option>In-Progress</option><option>Passed / Graduated</option><option>Failed</option>
                </select>
              </div>
            </div>

            <div className="eyebrow mb-3">Log capaian harian</div>
            <form onSubmit={addEntry} className="grid grid-cols-3 gap-2 mb-4">
              <input type="date" value={entry.entry_date} onChange={(e) => setEntry({ ...entry, entry_date: e.target.value })} className="bg-transparent border-b hairline outline-none py-2 text-[13px]" />
              <input placeholder={drawer.ojt_target_type === "Revenue" ? "Deskripsi" : "Nama UMKM/Customer"} value={entry.label} onChange={(e) => setEntry({ ...entry, label: e.target.value })} className="bg-transparent border-b hairline outline-none py-2 text-[13px]" />
              <input type="number" placeholder={drawer.ojt_target_type === "Revenue" ? "Rp" : "Qty"} value={entry.amount} onChange={(e) => setEntry({ ...entry, amount: parseFloat(e.target.value) || 0 })} className="bg-transparent border-b hairline outline-none py-2 text-[13px]" />
              <button type="submit" className="col-span-3 mt-2 py-2.5 bg-[color:var(--ink)] text-[color:var(--cream)] rounded-full text-[12px] font-mono-ed uppercase tracking-widest">Tambah Capaian</button>
            </form>

            <div className="paper-2 p-4">
              <div className="eyebrow mb-3">Riwayat</div>
              {(drawer.progress_entries || []).length === 0 ? <div className="text-[12px] text-[color:var(--ink-3)]">Belum ada capaian.</div> :
                (drawer.progress_entries || []).map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-1.5 border-b hairline last:border-0 text-[13px]">
                    <div><span className="font-mono-ed text-[11px] text-[color:var(--ink-3)]">{shortDate(p.entry_date)}</span> · {p.label || "—"}</div>
                    <div className="font-medium">{drawer.ojt_target_type === "Revenue" ? currency(p.amount) : p.amount}</div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
