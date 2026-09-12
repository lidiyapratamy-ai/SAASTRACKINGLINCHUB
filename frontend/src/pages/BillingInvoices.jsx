import { useEffect, useState } from "react";
import { api, formatApiError, shortDate, currency } from "../lib/api";
import { toast } from "sonner";
import { Plus, X, Download, Trash2, Send } from "lucide-react";

const empty = {
  client_company: "", client_address: "", client_pic: "", client_phone: "", client_email: "",
  issue_date: new Date().toISOString().slice(0, 10),
  due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  items: [{ description: "Wawancara CDD", qty: 1, unit_price: 50000 }],
  tax_percent: 11, status: "Draft", notes: "",
};

export default function BillingInvoices() {
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState({});
  const [show, setShow] = useState(false);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);

  const load = () => api.get("/invoices").then(({ data }) => setItems(data)).catch((e) => toast.error(formatApiError(e)));
  useEffect(() => { load(); api.get("/settings").then(({ data }) => setSettings(data)); }, []);

  const subtotal = form.items.reduce((s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.unit_price) || 0), 0);
  const tax = subtotal * (parseFloat(form.tax_percent) / 100);
  const total = subtotal + tax;

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/invoices/${editing}`, form);
      else await api.post("/invoices", form);
      toast.success("Invoice tersimpan"); setShow(false); setForm(empty); setEditing(null); load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const del = async (id) => { if (!confirm("Hapus invoice ini?")) return; await api.delete(`/invoices/${id}`); load(); };

  const sendInvoice = async (inv) => {
    if (!inv.client_email) { toast.error("Isi Email klien dulu sebelum kirim"); return; }
    if (!confirm(`Kirim invoice ${inv.invoice_no} ke ${inv.client_email}?`)) return;
    try {
      const { data } = await api.post(`/invoices/${inv.id}/send`);
      toast.success(`Terkirim ke ${data.sent_to}`);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const openPreview = (inv) => setPreview(inv);
  const exportPDF = (inv) => {
    const w = window.open("", "_blank");
    if (!w) return;
    const rows = inv.items.map((i) => `<tr><td>${i.description}</td><td class="r">${i.qty}</td><td class="r">${currency(i.unit_price)}</td><td class="r">${currency(i.qty * i.unit_price)}</td></tr>`).join("");
    w.document.write(`<!doctype html><html><head><title>${inv.invoice_no}</title>
      <style>body{font-family:Georgia,serif;color:#1B1B1F;background:#FAF6EE;padding:40px;max-width:820px;margin:auto}
      h1{font-weight:400;font-size:28px;margin:0 0 4px} .mono{font-family:Menlo,monospace;letter-spacing:.1em;text-transform:uppercase;font-size:11px;color:#6B6B6F}
      table{width:100%;border-collapse:collapse;margin-top:24px} th,td{padding:10px 6px;border-bottom:1px solid #D9D2BF;text-align:left;font-size:13px}
      th{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#6B6B6F} .r{text-align:right} .totals{margin-top:16px;width:280px;margin-left:auto}
      .totals div{display:flex;justify-content:space-between;padding:6px 0} .totals .grand{border-top:1px solid #1B1B1F;font-weight:600;font-size:16px;margin-top:6px;padding-top:10px}
      .head{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;border-bottom:1px solid #D9D2BF}
      .brand{max-height:60px} img{max-height:80px}</style></head><body>
      <div class="head"><div>${settings.letterhead_url ? `<img src="${settings.letterhead_url}" class="brand"/>` : `<h1>${settings.company_name || "PT. Linchub Network Indonesia"}</h1>`}<div class="mono">${settings.company_name || "PT. Linchub Network Indonesia"}</div></div>
      <div style="text-align:right"><div class="mono">Invoice</div><h1>${inv.invoice_no}</h1><div class="mono">Issue ${shortDate(inv.issue_date)} · Due ${shortDate(inv.due_date)}</div></div></div>
      <div style="margin-top:24px"><div class="mono">Bill to</div><div style="margin-top:6px;font-size:14px"><strong>${inv.client_company}</strong><br>${inv.client_pic || ""}<br>${inv.client_address || ""}<br>${inv.client_phone || ""} · ${inv.client_email || ""}</div></div>
      <table><thead><tr><th>Deskripsi</th><th class="r">QTY</th><th class="r">Harga Satuan</th><th class="r">Subtotal</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="totals"><div><span>Subtotal</span><span>${currency(inv.subtotal)}</span></div><div><span>PPN ${inv.tax_percent}%</span><span>${currency(inv.tax)}</span></div><div class="grand"><span>Total</span><span>${currency(inv.total)}</span></div></div>
      <div style="margin-top:60px;display:flex;justify-content:flex-end;gap:24px;align-items:end">${settings.stamp_url ? `<img src="${settings.stamp_url}"/>` : ""}${settings.signature_url ? `<img src="${settings.signature_url}"/>` : ""}</div>
      <div style="margin-top:40px" class="mono">${inv.notes || ""}</div>
      <script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div><div className="eyebrow mb-2">Billing · Create & Manage Invoices · Live Dynamic Template</div><h1 className="font-serif-editorial text-[40px] leading-tight tracking-tight">Invoices.</h1></div>
        <button onClick={() => { setEditing(null); setForm(empty); setShow(true); }} data-testid="new-invoice-btn" className="inline-flex items-center gap-2 pl-4 pr-3 py-2.5 rounded-full bg-[color:var(--ink)] text-[color:var(--cream)] text-[12px] font-mono-ed uppercase tracking-widest"><Plus size={14} /> New Invoice</button>
      </div>

      <div className="paper overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-5 py-3 text-[11px] font-mono-ed uppercase tracking-widest text-[color:var(--ink-3)] border-b hairline">
          <div className="col-span-3">No. Invoice</div><div className="col-span-3">Klien</div><div className="col-span-2">Issue / Due</div><div className="col-span-2">Total</div><div className="col-span-1">Status</div><div className="col-span-1 text-right">Aksi</div>
        </div>
        {items.length === 0 ? <div className="px-5 py-16 text-center text-[color:var(--ink-3)] text-[13px]">Belum ada invoice.</div> :
          items.map((i) => (
            <div key={i.id} className="grid grid-cols-12 gap-4 px-5 py-4 border-b hairline text-[13px] items-center hover:bg-[color:var(--cream-2)]">
              <div className="col-span-3 font-mono-ed text-[12px]">{i.invoice_no}</div>
              <div className="col-span-3">{i.client_company}</div>
              <div className="col-span-2 text-[12px]">{shortDate(i.issue_date)} → {shortDate(i.due_date)}</div>
              <div className="col-span-2 font-medium">{currency(i.total)}</div>
              <div className="col-span-1">
                <select value={i.status} onChange={async (e) => { await api.put(`/invoices/${i.id}`, { ...i, status: e.target.value }); load(); }} className="text-[11px] font-mono-ed border hairline rounded-full px-2 py-1 bg-transparent">
                  <option>Draft</option><option>Sent</option><option>Paid</option><option>Overdue</option>
                </select>
              </div>
              <div className="col-span-1 flex justify-end gap-1.5">
                <button onClick={() => sendInvoice(i)} data-testid={`send-invoice-${i.id}`} className="p-1.5 hover:bg-[color:var(--cream-2)] rounded" title="Kirim via Email"><Send size={13} /></button>
                <button onClick={() => openPreview(i)} className="p-1.5 hover:bg-[color:var(--cream-2)] rounded" title="Preview"><Download size={13} /></button>
                <button onClick={() => del(i.id)} className="p-1.5 hover:bg-[color:var(--cream-2)] rounded text-[color:var(--destructive)]" title="Delete"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
      </div>

      {show && (
        <div className="fixed inset-0 z-50 bg-black/30 grid place-items-center p-4 overflow-y-auto">
          <form onSubmit={save} className="paper w-full max-w-3xl p-8 bg-[color:var(--cream)] my-8">
            <div className="flex items-start justify-between mb-6">
              <div><div className="eyebrow mb-1">{editing ? "Edit" : "New"} invoice</div><h3 className="font-serif-editorial text-[26px]">Live dynamic template.</h3></div>
              <button type="button" onClick={() => setShow(false)}><X size={18} /></button>
            </div>

            <div className="grid grid-cols-2 gap-5 mb-6">
              {[["client_company", "Nama Perusahaan"], ["client_pic", "PIC"], ["client_phone", "No. Telp"], ["client_email", "Email"]].map(([k, l]) => (
                <div key={k}><label className="eyebrow block mb-1.5">{l}</label><input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="w-full bg-transparent border-b hairline outline-none py-2 text-[14px]" /></div>
              ))}
              <div className="col-span-2"><label className="eyebrow block mb-1.5">Alamat</label><input value={form.client_address} onChange={(e) => setForm({ ...form, client_address: e.target.value })} className="w-full bg-transparent border-b hairline outline-none py-2 text-[14px]" /></div>
              <div><label className="eyebrow block mb-1.5">Tanggal Terbit</label><input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} className="w-full bg-transparent border-b hairline outline-none py-2 text-[14px]" /></div>
              <div><label className="eyebrow block mb-1.5">Jatuh Tempo</label><input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="w-full bg-transparent border-b hairline outline-none py-2 text-[14px]" /></div>
            </div>

            <div className="eyebrow mb-3">Item billing</div>
            <div className="space-y-2 mb-4">
              {form.items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input placeholder="Deskripsi" value={it.description} onChange={(e) => { const items = [...form.items]; items[idx].description = e.target.value; setForm({ ...form, items }); }} className="col-span-6 bg-transparent border-b hairline outline-none py-2 text-[13px]" />
                  <input type="number" placeholder="QTY" value={it.qty} onChange={(e) => { const items = [...form.items]; items[idx].qty = parseFloat(e.target.value) || 0; setForm({ ...form, items }); }} className="col-span-2 bg-transparent border-b hairline outline-none py-2 text-[13px]" />
                  <input type="number" placeholder="Harga Satuan" value={it.unit_price} onChange={(e) => { const items = [...form.items]; items[idx].unit_price = parseFloat(e.target.value) || 0; setForm({ ...form, items }); }} className="col-span-3 bg-transparent border-b hairline outline-none py-2 text-[13px]" />
                  <button type="button" onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })} className="col-span-1 text-[color:var(--ink-3)]"><X size={14} /></button>
                </div>
              ))}
              <button type="button" onClick={() => setForm({ ...form, items: [...form.items, { description: "", qty: 1, unit_price: 0 }] })} className="text-[11px] font-mono-ed uppercase tracking-widest link-quiet">+ Tambah item</button>
            </div>

            <div className="grid grid-cols-2 gap-6 mt-6">
              <div><label className="eyebrow block mb-1.5">PPN %</label><input type="number" value={form.tax_percent} onChange={(e) => setForm({ ...form, tax_percent: parseFloat(e.target.value) || 0 })} className="w-full bg-transparent border-b hairline outline-none py-2 text-[14px]" /></div>
              <div className="text-right">
                <div className="text-[12px] text-[color:var(--ink-3)]">Subtotal: <span className="font-mono-ed">{currency(subtotal)}</span></div>
                <div className="text-[12px] text-[color:var(--ink-3)]">PPN: <span className="font-mono-ed">{currency(tax)}</span></div>
                <div className="font-serif-editorial text-[26px] mt-1">{currency(total)}</div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button type="button" onClick={() => setShow(false)} className="px-5 py-2.5 text-[12px] font-mono-ed uppercase tracking-widest border hairline rounded-full">Cancel</button>
              <button type="submit" className="px-5 py-2.5 text-[12px] font-mono-ed uppercase tracking-widest bg-[color:var(--ink)] text-[color:var(--cream)] rounded-full">Simpan Invoice</button>
            </div>
          </form>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
          <div className="bg-[color:var(--cream)] paper w-full max-w-3xl p-10 relative">
            <button onClick={() => setPreview(null)} className="absolute right-4 top-4"><X size={18} /></button>
            <div className="flex justify-between items-start border-b hairline pb-6">
              <div>{settings.letterhead_url ? <img src={settings.letterhead_url} className="max-h-16" alt="" /> : <h1 className="font-serif-editorial text-[26px]">{settings.company_name || "PT. Linchub Network Indonesia"}</h1>}<div className="eyebrow mt-2">{settings.company_name || "PT. Linchub Network Indonesia"}</div></div>
              <div className="text-right"><div className="eyebrow">Invoice</div><h1 className="font-serif-editorial text-[26px]">{preview.invoice_no}</h1><div className="font-mono-ed text-[11px] text-[color:var(--ink-3)] mt-1">{shortDate(preview.issue_date)} → {shortDate(preview.due_date)}</div></div>
            </div>
            <div className="mt-5"><div className="eyebrow">Bill to</div><div className="mt-1"><strong>{preview.client_company}</strong><div className="text-[13px] text-[color:var(--ink-2)]">{preview.client_pic}<br />{preview.client_address}<br />{preview.client_phone} · {preview.client_email}</div></div></div>
            <table className="w-full mt-6 text-[13px]">
              <thead><tr className="border-b hairline"><th className="eyebrow text-left py-2">Deskripsi</th><th className="eyebrow text-right py-2">QTY</th><th className="eyebrow text-right py-2">Harga</th><th className="eyebrow text-right py-2">Subtotal</th></tr></thead>
              <tbody>{preview.items.map((i, x) => <tr key={x} className="border-b hairline"><td className="py-2">{i.description}</td><td className="py-2 text-right">{i.qty}</td><td className="py-2 text-right font-mono-ed">{currency(i.unit_price)}</td><td className="py-2 text-right font-mono-ed">{currency(i.qty * i.unit_price)}</td></tr>)}</tbody>
            </table>
            <div className="w-72 ml-auto mt-4 text-[13px]">
              <div className="flex justify-between py-1"><span>Subtotal</span><span className="font-mono-ed">{currency(preview.subtotal)}</span></div>
              <div className="flex justify-between py-1"><span>PPN {preview.tax_percent}%</span><span className="font-mono-ed">{currency(preview.tax)}</span></div>
              <div className="flex justify-between py-2 border-t border-[color:var(--ink)] mt-2 font-serif-editorial text-[18px]"><span>Total</span><span>{currency(preview.total)}</span></div>
            </div>
            <div className="mt-16 flex justify-end gap-3">
              <button onClick={() => exportPDF(preview)} className="px-5 py-2.5 text-[12px] font-mono-ed uppercase tracking-widest bg-[color:var(--ink)] text-[color:var(--cream)] rounded-full">Print / Save PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
