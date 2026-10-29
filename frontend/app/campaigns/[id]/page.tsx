"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  api,
  Campaign,
  CAMPAIGN_STATUSES,
  Lead,
  LEAD_STATUSES,
  LeadStatus,
  parseLeads,
  Stats,
} from "@/lib/api";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export default function CampaignPage() {
  const id = Number(useParams<{ id: string }>().id);
  const [campaign, setCampaign] = useState<(Campaign & { stats: Stats }) | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<LeadStatus | "">("");
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [c, l] = await Promise.all([api.getCampaign(id), api.listLeads(id, filter || undefined)]);
      setCampaign(c);
      setLeads(l.items);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id, filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(action: () => Promise<unknown>, success?: string) {
    setError("");
    setMessage("");
    try {
      await action();
      if (success) setMessage(success);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!campaign) return <p className="text-sm text-slate-500">{error || "Loading…"}</p>;
  const s = campaign.stats;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
          ← All campaigns
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <p className="text-slate-500">{campaign.subject}</p>
          </div>
          <select
            value={campaign.status}
            onChange={(e) => run(() => api.setCampaignStatus(id, e.target.value as Campaign["status"]))}
            className="rounded border bg-white px-3 py-2 text-sm"
          >
            {CAMPAIGN_STATUSES.map((st) => (
              <option key={st}>{st}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded bg-green-50 p-3 text-sm text-green-700">{message}</p>}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total leads" value={s.total} />
        <StatCard label="Sent" value={s.byStatus.sent} />
        <StatCard label="Reply rate" value={`${s.replyRate}%`} />
        <StatCard label="Bounce rate" value={`${s.bounceRate}%`} />
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-2 font-semibold">Add leads</h2>
        <p className="mb-2 text-xs text-slate-500">One per line: email, first name, company (name and company optional). Duplicates are skipped.</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder={"jane@acme.com, Jane, Acme\nbob@globex.com"}
          className="w-full rounded border px-3 py-2 font-mono text-sm"
        />
        <button
          onClick={() =>
            run(async () => {
              const r = await api.addLeads(id, parseLeads(text));
              setText("");
              setMessage(`Added ${r.inserted} lead(s), skipped ${r.skipped} duplicate(s).`);
            })
          }
          disabled={!text.trim()}
          className="mt-2 rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          Import leads
        </button>
      </section>

      <section className="overflow-hidden rounded-lg border bg-white">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">Leads</h2>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as LeadStatus | "")}
            className="rounded border px-2 py-1 text-sm"
          >
            <option value="">All statuses</option>
            {LEAD_STATUSES.map((st) => (
              <option key={st}>{st}</option>
            ))}
          </select>
        </div>
        {leads.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">No leads to show.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Company</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {leads.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-2">{l.email}</td>
                  <td className="px-4 py-2">{l.firstName ?? "—"}</td>
                  <td className="px-4 py-2">{l.company ?? "—"}</td>
                  <td className="px-4 py-2">
                    <select
                      value={l.status}
                      onChange={(e) => run(() => api.setLeadStatus(l.id, e.target.value as LeadStatus))}
                      className="rounded border px-2 py-1 text-xs"
                    >
                      {LEAD_STATUSES.map((st) => (
                        <option key={st}>{st}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
