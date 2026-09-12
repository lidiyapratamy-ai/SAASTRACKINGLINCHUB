import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

export default function ProjectAnalyst() {
  const [items, setItems] = useState([]);
  const [range, setRange] = useState("Monthly");

  useEffect(() => { api.get("/projects").then(({ data }) => setItems(data)).catch(() => {}); }, []);

  const total = items.length;
  const deal = items.filter((p) => p.stage === "Closed/Deal").length;
  const conv = total ? Math.round((deal / total) * 100) : 0;

  const buckets = {};
  items.forEach((p) => {
    const d = p.contact_date ? new Date(p.contact_date) : new Date(p.created_at);
    const key = range === "Weekly" ? `W${Math.ceil(d.getDate() / 7)}` : range === "Yearly" ? `${d.getFullYear()}` : d.toLocaleString("en", { month: "short" });
    buckets[key] = (buckets[key] || 0) + 1;
  });
  const chart = Object.entries(buckets).map(([k, v]) => ({ k, v }));

  const stageBuckets = ["Contacted", "Meeting CR", "Finishing Meeting", "Proposal", "Closed/Deal"].map((s) => ({ s, n: items.filter((i) => i.stage === s).length }));

  return (
    <div>
      <div className="eyebrow mb-2">Project · Analyst</div>
      <h1 className="font-serif-editorial text-[40px] leading-tight tracking-tight mb-8">Acquisition performance.</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[["Total Leads", total], ["Closed Deal", deal], ["Conversion Rate", conv + "%"]].map(([l, v]) => (
          <div key={l} className="paper p-6">
            <div className="eyebrow mb-2">{l}</div>
            <div className="font-serif-editorial text-[38px]">{v}</div>
          </div>
        ))}
      </div>

      <div className="paper p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="eyebrow">Acquisition trend</div>
          <div className="inline-flex border hairline rounded-full overflow-hidden">
            {["Weekly", "Monthly", "Yearly"].map((r) => (
              <button key={r} onClick={() => setRange(r)} className={`px-3 py-1.5 text-[11px] font-mono-ed uppercase tracking-widest ${range === r ? "bg-[color:var(--ink)] text-[color:var(--cream)]" : "hover:bg-[color:var(--cream-2)]"}`}>{r}</button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chart}>
            <CartesianGrid strokeDasharray="2 4" stroke="#D9D2BF" />
            <XAxis dataKey="k" stroke="#6B6B6F" fontSize={11} />
            <YAxis stroke="#6B6B6F" fontSize={11} />
            <Tooltip contentStyle={{ background: "#FAF6EE", border: "1px solid #D9D2BF", borderRadius: 6 }} />
            <Line type="monotone" dataKey="v" stroke="#1B1B1F" strokeWidth={2} dot={{ fill: "#2F6F5E", r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="paper p-6">
        <div className="eyebrow mb-6">Stage distribution</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stageBuckets}>
            <CartesianGrid strokeDasharray="2 4" stroke="#D9D2BF" />
            <XAxis dataKey="s" stroke="#6B6B6F" fontSize={11} />
            <YAxis stroke="#6B6B6F" fontSize={11} />
            <Tooltip contentStyle={{ background: "#FAF6EE", border: "1px solid #D9D2BF", borderRadius: 6 }} />
            <Bar dataKey="n" fill="#2F6F5E" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
