import { useEffect, useState } from "react";
import { api, currency } from "../lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Download } from "lucide-react";

export default function Analyst() {
  const [data, setData] = useState(null);
  const [range, setRange] = useState("Monthly");

  useEffect(() => { api.get("/analytics/overview").then(({ data }) => setData(data)); }, []);

  const funnel = data ? [
    { k: "Sourced", n: data.funnel.sourced }, { k: "CDD Interview", n: data.funnel.interview },
    { k: "OJT 14 Hari", n: data.funnel.ojt }, { k: "Passed / Graduated", n: data.funnel.passed },
  ] : [];

  const bottleneck = data && data.funnel.interview > data.funnel.ojt * 2;

  const exportAll = async (fmt) => {
    const [{ data: projects }, { data: candidates }, { data: invoices }] = await Promise.all([
      api.get("/projects"), api.get("/candidates"), api.get("/invoices"),
    ]);
    if (fmt === "csv") {
      const rows = [["Entity", "ID", "Name/Company", "Stage/Status", "Total"]];
      projects.forEach((p) => rows.push(["Project", p.id, p.company_name, p.stage, ""]));
      candidates.forEach((c) => rows.push(["Candidate", c.id, c.name, c.stage, ""]));
      invoices.forEach((i) => rows.push(["Invoice", i.invoice_no, i.client_company, i.status, i.total]));
      const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      const a = document.createElement("a"); a.href = url; a.download = `linchub-export-${Date.now()}.csv`; a.click();
    } else {
      const blob = new Blob([JSON.stringify({ projects, candidates, invoices }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `linchub-export-${Date.now()}.json`; a.click();
    }
  };

  if (!data) return <div className="text-[color:var(--ink-3)] font-mono-ed text-[12px] uppercase tracking-widest">Loading…</div>;

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div><div className="eyebrow mb-2">Analyst · Executive Performance</div><h1 className="font-serif-editorial text-[40px] leading-tight tracking-tight">Global analyst.</h1></div>
        <div className="flex items-center gap-2">
          <div className="inline-flex border hairline rounded-full overflow-hidden">{["Daily", "Weekly", "Monthly", "Yearly"].map((r) => <button key={r} onClick={() => setRange(r)} className={`px-3 py-1.5 text-[11px] font-mono-ed uppercase tracking-widest ${range === r ? "bg-[color:var(--ink)] text-[color:var(--cream)]" : "hover:bg-[color:var(--cream-2)]"}`}>{r}</button>)}</div>
          <button onClick={() => exportAll("csv")} className="inline-flex items-center gap-1 px-3 py-1.5 border hairline rounded-full text-[11px] font-mono-ed uppercase tracking-widest hover:bg-[color:var(--cream-2)]"><Download size={12} /> CSV</button>
          <button onClick={() => exportAll("json")} className="inline-flex items-center gap-1 px-3 py-1.5 border hairline rounded-full text-[11px] font-mono-ed uppercase tracking-widest hover:bg-[color:var(--cream-2)]"><Download size={12} /> XLSX</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[["Total Active Projects", data.active_projects], ["Success Hired", data.hired_candidates], ["MRR / Paid Total", currency(data.mrr)], ["Conversion Rate", data.conversion_rate + "%"]].map(([l, v]) => (
          <div key={l} className="paper p-6"><div className="eyebrow mb-2">{l}</div><div className="font-serif-editorial text-[34px]">{v}</div></div>
        ))}
      </div>

      <div className="paper p-6 mb-6">
        <div className="flex items-center justify-between mb-2"><div className="eyebrow">Candidate conversion funnel</div>
          {bottleneck && <span className="pill" style={{ borderColor: "#B36A4A", color: "#B36A4A" }}>⚠ Bottleneck at CDD Interview</span>}
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={funnel} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#D9D2BF" />
            <XAxis type="number" stroke="#6B6B6F" fontSize={11} /><YAxis dataKey="k" type="category" stroke="#6B6B6F" fontSize={11} width={130} />
            <Tooltip contentStyle={{ background: "#FAF6EE", border: "1px solid #D9D2BF" }} />
            <Bar dataKey="n" fill="#1B1B1F" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="paper p-6">
        <div className="eyebrow mb-4">Lead stage distribution</div>
        <div className="grid grid-cols-5 gap-4">
          {Object.entries(data.lead_stages).map(([s, n]) => (
            <div key={s} className="border-t hairline pt-3"><div className="eyebrow">{s}</div><div className="font-serif-editorial text-[28px] mt-1">{n}</div></div>
          ))}
        </div>
      </div>
    </div>
  );
}
