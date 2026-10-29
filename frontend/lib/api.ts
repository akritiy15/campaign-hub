const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const KEY = process.env.NEXT_PUBLIC_API_KEY ?? "";

export type CampaignStatus = "draft" | "active" | "paused" | "completed";
export type LeadStatus = "pending" | "sent" | "replied" | "bounced" | "unsubscribed";

export interface Campaign {
  id: number;
  name: string;
  subject: string;
  status: CampaignStatus;
  createdAt: string;
}

export interface Stats {
  total: number;
  byStatus: Record<LeadStatus, number>;
  replyRate: number;
  bounceRate: number;
}

export interface Lead {
  id: number;
  email: string;
  firstName: string | null;
  company: string | null;
  status: LeadStatus;
}

export const CAMPAIGN_STATUSES: CampaignStatus[] = ["draft", "active", "paused", "completed"];
export const LEAD_STATUSES: LeadStatus[] = ["pending", "sent", "replied", "bounced", "unsubscribed"];

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(KEY ? { "x-api-key": KEY } : {}),
      ...init?.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.details?.map((d: { message: string }) => d.message).join(", ");
    throw new Error(detail ? `${data.error}: ${detail}` : data.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  listCampaigns: () => request<{ items: Campaign[]; total: number }>("/campaigns?limit=100"),
  createCampaign: (body: { name: string; subject: string }) =>
    request<Campaign>("/campaigns", { method: "POST", body: JSON.stringify(body) }),
  getCampaign: (id: number) => request<Campaign & { stats: Stats }>(`/campaigns/${id}`),
  setCampaignStatus: (id: number, status: CampaignStatus) =>
    request<Campaign>(`/campaigns/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  listLeads: (id: number, status?: LeadStatus) =>
    request<{ items: Lead[]; total: number }>(`/campaigns/${id}/leads?limit=100${status ? `&status=${status}` : ""}`),
  addLeads: (id: number, leads: { email: string; firstName?: string; company?: string }[]) =>
    request<{ inserted: number; skipped: number }>(`/campaigns/${id}/leads`, {
      method: "POST",
      body: JSON.stringify({ leads }),
    }),
  setLeadStatus: (leadId: number, status: LeadStatus) =>
    request<Lead>(`/leads/${leadId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
};

/** Parses lines like "jane@acme.com, Jane, Acme" (first name and company optional). */
export function parseLeads(text: string) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [email, firstName, company] = line.split(",").map((s) => s.trim());
      return { email, ...(firstName ? { firstName } : {}), ...(company ? { company } : {}) };
    });
}
