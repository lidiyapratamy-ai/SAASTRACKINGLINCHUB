import { useEffect, useState } from "react";
import { api, currency, shortDate } from "../lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Download } from "lucide-react";

export default function BillingCashflow() {
  const [invoices, setInvoices] = useState([]);
  const [range, setRange] = useState("Monthly");
  const [status, setStatus] = useState("All");

  useEffect(() => { api.get("/invoices").then(({ data }) => setInvoices(data)); }, []);

  const paid = invoices.filter((i) => i.status === "Paid").reduce((s, i) => s + i.total, 0);
  const pending = invoices.filter((i) => ["Sent", "Draft"].includes(i.status)).reduce((s, i) => s + i.total, 0);
  const overdue = invoices.filter((i) => i.status === "Overdue").reduce((s, i) => s + i.total, 0);

  const filtered = status === "All" ? invoices : invoices.filter((i) => i.status === status);

  const buckets = {};
  invoices.forEach((i) => {
    const d = new Date(i.issue_date || i.created_at);
    const key = range === "Yearly" ? `${d.getFullYear()}` : range === "Weekly" ? `W${Math.ceil(d.getDate() / 7)}` : d.toLocaleString("en", { month: "short" });
    if (!buckets[key]) buckets[key] = { key, paid: 0, pending: 0, overdue: 0 };
    if (i.status === "Paid") buckets[key].paid += i.total;
    else if (i.status === "Overdue") buckets[key].overdue += i.total;
    else buckets[key].pending += i.total;
  });
  const chart = Object.values(buckets);

  const pie = [
    { name: "Paid", value: paid, fill: "#2F6F5E" },
    { name: "Pending", value: pending, fill: "#B58900" },
    { name: "Overdue", value: overdue, fill: "#B36A4A" },
  ];

  const exportCSV = () => {
    const rows = [["Invoice No", "Client", "Issue", "Due", "Status", "Subtotal", "Tax", "Total"]];
    filtered.forEach((i) => rows.push([i.invoice_no, i.client_company, i.issue_date, i.due_date, i.status, i.subtotal, i.tax, i.total]));
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `linchub-cashflow-${Date.now()}.csv`; a.click();
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div><div className="eyebrow mb-2">Billing · Analyst & Cashflow</div><h1 className="font-serif-editorial text-[40px] leading-tight tracking-tight">Cashflow.</h1></div>
        <button onClick={exportCSV} className="inline-flex items-center gap-2 pl-4 pr-3 py-2.5 rounded-full border hairline text-[12px] font-mono-ed uppercase tracking-widest hover:bg-[color:var(--cream-2)]"><Download size={14} /> Export CSV</button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="paper p-6"><div className="eyebrow mb-2">Total Revenue (Paid)</div><div className="font-serif-editorial text-[32px]">{currency(paid)}</div></div>
        <div className="paper p-6"><div className="eyebrow mb-2">Pending & Outstanding</div><div className="font-serif-editorial text-[32px]">{currency(pending)}</div></div>
        <div className="paper p-6"><div className="eyebrow mb-2">Overdue Total</div><div className="font-serif-editorial text-[32px] text-[color:var(--clay)]">{currency(overdue)}</div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 paper p-6">
          <div className="flex items-center justify-between mb-6"><div className="eyebrow">Projected cashflow · {range}</div>
            <div className="inline-flex border hairline rounded-full overflow-hidden">{["Weekly", "Monthly", "Yearly"].map((r) => <button key={r} onClick={() => setRange(r)} className={`px-3 py-1.5 text-[11px] font-mono-ed uppercase tracking-widest ${range === r ? "bg-[color:var(--ink)] text-[color:var(--cream)]" : "hover:bg-[color:var(--cream-2)]"}`}>{r}</button>)}</div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="2 4" stroke="#D9D2BF" />
              <XAxis dataKey="key" stroke="#6B6B6F" fontSize={11} /><YAxis stroke="#6B6B6F" fontSize={11} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}jt`} />
              <Tooltip contentStyle={{ background: "#FAF6EE", border: "1px solid #D9D2BF" }} formatter={(v) => currency(v)} />
              <Bar dataKey="paid" stackId="a" fill="#2F6F5E" /><Bar dataKey="pending" stackId="a" fill="#B58900" /><Bar dataKey="overdue" stackId="a" fill="#B36A4A" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="paper p-6">
          <div className="eyebrow mb-6">Composition</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart><Pie data={pie} innerRadius={45} outerRadius={80} dataKey="value">{pie.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><Legend wrapperStyle={{ fontSize: 11, fontFamily: "JetBrains Mono" }} /></PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="paper overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b hairline">
          <div className="eyebrow">Invoice ledger</div>
          <div className="inline-flex border hairline rounded-full overflow-hidden">{["All", "Draft", "Sent", "Paid", "Overdue"].map((s) => <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 text-[11px] font-mono-ed uppercase tracking-widest ${status === s ? "bg-[color:var(--ink)] text-[color:var(--cream)]" : "hover:bg-[color:var(--cream-2)]"}`}>{s}</button>)}</div>
        </div>
        <div className="grid grid-cols-12 gap-4 px-5 py-3 text-[11px] font-mono-ed uppercase tracking-widest text-[color:var(--ink-3)] border-b hairline">
          <div className="col-span-3">No. Invoice</div><div className="col-span-3">Klien</div><div className="col-span-2">Issue</div><div className="col-span-2">Status</div><div className="col-span-2 text-right">Total</div>
        </div>
        {filtered.map((i) => (
          <div key={i.id} className="grid grid-cols-12 gap-4 px-5 py-3 border-b hairline text-[13px] items-center">
            <div className="col-span-3 font-mono-ed text-[12px]">{i.invoice_no}</div>
            <div className="col-span-3">{i.client_company}</div>
            <div className="col-span-2 text-[12px]">{shortDate(i.issue_date)}</div>
            <div className="col-span-2"><span className="pill">{i.status}</span></div>
            <div className="col-span-2 text-right font-medium">{currency(i.total)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
