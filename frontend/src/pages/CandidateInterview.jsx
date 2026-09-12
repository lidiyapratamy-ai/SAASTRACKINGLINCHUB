import { useEffect, useState } from "react";
import { api, formatApiError, shortDate } from "../lib/api";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

const SOURCES = ["INTERNAL", "EKSTERNAL", "MASSIVE"];
const CLUSTERS = ["Stages", "Fractional"];

const empty = {
  name: "", position: "", client_company: "", interview_at: "",
  source: "INTERNAL", cluster: "Stages", stage: "INTERVIEW",
};

export default function CandidateInterview() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(empty);
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = () => api.get("/candidates").then(({ data }) => setItems(data.filter((c) => c.stage === "INTERVIEW"))).catch((e) => toast.error(formatApiError(e)));
  useEffect(load, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/candidates/${editing}`, form);
      else await api.post("/candidates", form);
      toast.success("Kandidat tersimpan"); setShow(false); setForm(empty); setEditing(null); load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const moveStage = async (c, stage) => {
    try {
      const patch = { ...c, stage };
      if (stage === "OJT" && !c.ojt_start) {
        const now = new Date();
        patch.ojt_start = now.toISOString().slice(0, 10);
        const end = new Date(now); end.setDate(end.getDate() + 14);
        patch.ojt_end = end.toISOString().slice(0, 10);
      }
      await api.put(`/candidates/${c.id}`, patch); toast.success(`Dipindah ke ${stage}`); load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="eyebrow mb-2">Candidate · Stage 1 – 2 · CDD & Client Interview</div>
          <h1 className="font-serif-editorial text-[40px] leading-tight tracking-tight">Interview stage.</h1>
        </div>
        <button onClick={() => { setEditing(null); setForm(empty); setShow(true); }} data-testid="new-candidate-btn"
          className="inline-flex items-center gap-2 pl-4 pr-3 py-2.5 rounded-full bg-[color:var(--ink)] text-[color:var(--cream)] hover:bg-[color:var(--ink-2)] text-[12px] font-mono-ed uppercase tracking-widest">
          <Plus size={14} /> Add Candidate
        </button>
      </div>

      <div className="paper overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-5 py-3 text-[11px] font-mono-ed uppercase tracking-widest text-[color:var(--ink-3)] border-b hairline">
          <div className="col-span-3">Nama / Posisi</div>
          <div className="col-span-3">Klien</div>
          <div className="col-span-2">Jadwal</div>
          <div className="col-span-2">Source / Cluster</div>
          <div className="col-span-2 text-right">Aksi</div>
        </div>
        {items.length === 0 ? <div className="px-5 py-16 text-center text-[color:var(--ink-3)] text-[13px]">Belum ada kandidat interview.</div> :
          items.map((c) => (
            <div key={c.id} className="grid grid-cols-12 gap-4 px-5 py-4 border-b hairline text-[13px] items-center hover:bg-[color:var(--cream-2)]">
              <div className="col-span-3"><div className="font-medium">{c.name}</div><div className="text-[12px] text-[color:var(--ink-3)]">{c.position}</div></div>
              <div className="col-span-3">{c.client_company}</div>
              <div className="col-span-2 text-[12px]">{shortDate(c.interview_at)}</div>
              <div className="col-span-2"><span className="pill mr-1">{c.source}</span><span className="pill">{c.cluster}</span></div>
              <div className="col-span-2 flex justify-end gap-2">
                <button onClick={() => moveStage(c, "OJT")} className="text-[11px] font-mono-ed uppercase tracking-widest link-quiet">→ OJT</button>
                <button onClick={() => { setEditing(c.id); setForm({ ...empty, ...c }); setShow(true); }} className="text-[11px] font-mono-ed uppercase tracking-widest link-quiet">Edit</button>
              </div>
            </div>
          ))}
      </div>

      {show && (
        <div className="fixed inset-0 z-50 bg-black/30 grid place-items-center p-4">
          <form onSubmit={save} className="paper w-full max-w-2xl p-8 bg-[color:var(--cream)]">
            <div className="flex items-start justify-between mb-6">
              <div><div className="eyebrow mb-1">{editing ? "Edit" : "New"} candidate</div><h3 className="font-serif-editorial text-[26px]">Data kandidat interview.</h3></div>
              <button type="button" onClick={() => setShow(false)}><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-5">
              {[["name", "Nama Kandidat", "text"], ["position", "Posisi / Role", "text"], ["client_company", "Perusahaan Klien", "text"], ["interview_at", "Tanggal & Jam", "datetime-local"]].map(([k, l, t]) => (
                <div key={k}><label className="eyebrow block mb-1.5">{l}</label>
                  <input type={t} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="w-full bg-transparent border-b hairline focus:border-[color:var(--ink)] outline-none py-2 text-[14px]" /></div>
              ))}
              <div><label className="eyebrow block mb-1.5">Source</label>
                <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="w-full bg-transparent border-b hairline outline-none py-2 text-[14px]">{SOURCES.map((s) => <option key={s}>{s}</option>)}</select>
              </div>
              <div><label className="eyebrow block mb-1.5">Cluster</label>
                <select value={form.cluster} onChange={(e) => setForm({ ...form, cluster: e.target.value })} className="w-full bg-transparent border-b hairline outline-none py-2 text-[14px]">{CLUSTERS.map((s) => <option key={s}>{s}</option>)}</select>
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button type="button" onClick={() => setShow(false)} className="px-5 py-2.5 text-[12px] font-mono-ed uppercase tracking-widest border hairline rounded-full">Cancel</button>
              <button type="submit" data-testid="submit-candidate" className="px-5 py-2.5 text-[12px] font-mono-ed uppercase tracking-widest bg-[color:var(--ink)] text-[color:var(--cream)] rounded-full">Simpan</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
