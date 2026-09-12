import { useState } from "react";
import { currency } from "../lib/api";
import { Lock } from "lucide-react";

export default function BillingPricing() {
  const [pax, setPax] = useState(10);
  const [gaji, setGaji] = useState(5000000);
  const [modelB, setModelB] = useState(false);

  const fractional = {
    setup: 55000,
    cdd: pax * 50000,
    ojt: pax * 100000,
    graduation: pax * 150000,
    mgmt: 2000000,
  };
  const fracTotal = fractional.setup + fractional.cdd + fractional.ojt + fractional.graduation;

  const stages = {
    setup: 55000,
    cdd: pax * 75000,
    jalurA: pax * 1750000,
    jalurB: pax * (0.45 * gaji),
  };

  const massiveTier = pax >= 50 ? 5 : pax >= 30 ? 10 : pax >= 15 ? 15 : 0;
  const massiveHandling = pax >= 50 ? 4500000 : pax >= 26 ? 3750000 : pax >= 15 ? 3000000 : 0;
  const massiveSuccess = pax * gaji * (massiveTier / 100);
  const requiresConsult = pax > 100;

  const Card = ({ title, children, muted }) => (
    <div className={`paper p-6 ${muted ? "opacity-70" : ""}`}>
      <div className="eyebrow mb-4">{title}</div>
      {children}
    </div>
  );

  const Row = ({ l, v }) => (
    <div className="flex items-center justify-between py-2 border-b hairline last:border-0 text-[13px]">
      <span className="text-[color:var(--ink-2)]">{l}</span>
      <span className="font-medium font-mono-ed">{currency(v)}</span>
    </div>
  );

  return (
    <div>
      <div className="eyebrow mb-2">Billing · Master Pricing & Custom Rate</div>
      <h1 className="font-serif-editorial text-[40px] leading-tight tracking-tight mb-2">Backend calculator rules.</h1>
      <p className="text-[14px] text-[color:var(--ink-2)] mb-8 max-w-2xl">Kalkulator otomatis untuk 3 jalur: Eksternal (Fractional / Stages), Massive, dan Internal (VVIP).</p>

      <div className="paper p-6 mb-8 flex flex-wrap items-end gap-6">
        <div className="flex-1 min-w-[200px]"><label className="eyebrow block mb-1.5">Jumlah PAX</label>
          <input type="number" value={pax} onChange={(e) => setPax(parseFloat(e.target.value) || 0)} className="w-full bg-transparent border-b hairline outline-none py-2 text-[16px]" data-testid="pricing-pax" /></div>
        <div className="flex-1 min-w-[200px]"><label className="eyebrow block mb-1.5">Gaji Bruto Rujukan</label>
          <input type="number" value={gaji} onChange={(e) => setGaji(parseFloat(e.target.value) || 0)} className="w-full bg-transparent border-b hairline outline-none py-2 text-[16px]" /></div>
        <label className="flex items-center gap-2 pb-2 text-[13px]"><input type="checkbox" checked={modelB} onChange={(e) => setModelB(e.target.checked)} /> Massive Model B (tanpa mgmt fee)</label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card title="Jalur Eksternal · Fractional (1–15)">
          <Row l="Setup & Onboarding" v={fractional.setup} />
          <Row l={`Wawancara CDD (${pax} × 50k)`} v={fractional.cdd} />
          <Row l={`Masuk Masa OJT (${pax} × 100k)`} v={fractional.ojt} />
          <Row l={`Kelulusan OJT (${pax} × 150k)`} v={fractional.graduation} />
          <div className="pt-3 mt-3 border-t hairline flex justify-between items-baseline"><span className="eyebrow">Sub-total</span><span className="font-serif-editorial text-[22px]">{currency(fracTotal)}</span></div>
          <div className="text-[11px] text-[color:var(--ink-3)] mt-2 font-mono-ed">Opsional Mgmt Fee: {currency(fractional.mgmt)}/bln · Insentif Rp 10–25k/unit</div>
        </Card>

        <Card title="Jalur Eksternal · Stages (1–15)">
          <Row l="Setup & Legal Portal" v={stages.setup} />
          <Row l={`Wawancara CDD (${pax} × 75k)`} v={stages.cdd} />
          <Row l={`Jalur A · OJT 14 Hari (${pax} × 1.75jt)`} v={stages.jalurA} />
          <Row l={`Jalur B · Direct Hire (${pax} × 45% × gaji)`} v={stages.jalurB} />
          <div className="pt-3 mt-3 border-t hairline flex justify-between items-baseline"><span className="eyebrow">Jalur A total</span><span className="font-serif-editorial text-[22px]">{currency(stages.setup + stages.cdd + stages.jalurA)}</span></div>
          <div className="flex justify-between items-baseline mt-1"><span className="eyebrow">Jalur B total</span><span className="font-serif-editorial text-[18px]">{currency(stages.setup + stages.cdd + stages.jalurB)}</span></div>
        </Card>

        <Card title={`Jalur Massive (>15) · Model ${modelB ? "B" : "A"}`}>
          {requiresConsult && <div className="mb-3 p-3 border hairline rounded-md bg-[color:var(--cream-2)] text-[12px]">⚠ Requires Founder Consult (&gt;100 PAX)</div>}
          <Row l={`Success Fee Tier (${massiveTier}%)`} v={massiveSuccess} />
          {!modelB && <Row l="Monthly Handling & Supervision" v={massiveHandling} />}
          <div className="pt-3 mt-3 border-t hairline flex justify-between items-baseline"><span className="eyebrow">Estimated total</span><span className="font-serif-editorial text-[22px]">{currency(massiveSuccess + (modelB ? 0 : massiveHandling))}</span></div>
          <div className="text-[11px] text-[color:var(--ink-3)] mt-2 font-mono-ed">Tier 15–29={pax >= 15 ? "15%" : "—"} · 30–49=10% · 50–100=5% · Insentif Rp 10–15k/unit</div>
        </Card>
      </div>

      <Card title="Jalur Internal · VVIP" muted>
        <div className="flex items-center gap-3 text-[14px]">
          <Lock size={16} className="text-[color:var(--ink-3)]" />
          <span className="text-[color:var(--ink-2)]"><strong>Locked</strong> — VVIP / Existing Group Special Rate (Lidya Group) — Custom Direct Billing Input Active</span>
        </div>
      </Card>
    </div>
  );
}
