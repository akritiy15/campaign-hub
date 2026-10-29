"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { api, Campaign } from "@/lib/api";

const badge: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  active: "bg-green-100 text-green-700",
  paused: "bg-amber-100 text-amber-700",
  completed: "bg-indigo-100 text-indigo-700",
};

export default function Home() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () =>
    api
      .listCampaigns()
      .then((r) => setCampaigns(r.items))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.createCampaign({ name, subject });
      setName("");
      setSubject("");
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-4 text-2xl font-bold">Campaigns</h1>
        <form onSubmit={onSubmit} className="grid gap-3 rounded-lg border bg-white p-4 sm:grid-cols-[1fr_1fr_auto]">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Campaign name"
            className="rounded border px-3 py-2 text-sm"
          />
          <input
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject line"
            className="rounded border px-3 py-2 text-sm"
          />
          <button className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Create
          </button>
        </form>
        {error && <p className="mt-3 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </section>

      <section className="overflow-hidden rounded-lg border bg-white">
        {loading ? (
          <p className="p-6 text-sm text-slate-500">Loading…</p>
        ) : campaigns.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">No campaigns yet — create your first one above.</p>
        ) : (
          <ul className="divide-y">
            {campaigns.map((c) => (
              <li key={c.id}>
                <Link href={`/campaigns/${c.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-slate-500">{c.subject}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge[c.status]}`}>{c.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
