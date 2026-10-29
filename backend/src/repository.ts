export const CAMPAIGN_STATUSES = ["draft", "active", "paused", "completed"] as const;
export const LEAD_STATUSES = ["pending", "sent", "replied", "bounced", "unsubscribed"] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export interface Campaign {
  id: number;
  name: string;
  subject: string;
  status: CampaignStatus;
  createdAt: string;
}

export interface Lead {
  id: number;
  campaignId: number;
  email: string;
  firstName: string | null;
  company: string | null;
  status: LeadStatus;
  createdAt: string;
}

export interface NewLead {
  email: string;
  firstName?: string | null;
  company?: string | null;
}

export interface Stats {
  total: number;
  byStatus: Record<LeadStatus, number>;
  /** replied / contacted, where contacted = sent + replied + bounced */
  replyRate: number;
  bounceRate: number;
}

export interface Page<T> {
  items: T[];
  total: number;
}

/**
 * The data-access contract. The API depends on this interface only, so it can run
 * against MySQL in production and an in-memory store in unit tests.
 */
export interface Repository {
  createCampaign(input: { name: string; subject: string }): Promise<Campaign>;
  listCampaigns(page: number, limit: number): Promise<Page<Campaign>>;
  getCampaign(id: number): Promise<Campaign | null>;
  updateCampaignStatus(id: number, status: CampaignStatus): Promise<Campaign | null>;
  addLeads(campaignId: number, leads: NewLead[]): Promise<{ inserted: number; skipped: number }>;
  listLeads(
    campaignId: number,
    opts: { page: number; limit: number; status?: LeadStatus }
  ): Promise<Page<Lead>>;
  updateLeadStatus(id: number, status: LeadStatus): Promise<Lead | null>;
  getStats(campaignId: number): Promise<Stats>;
}

export function emptyCounts(): Record<LeadStatus, number> {
  return { pending: 0, sent: 0, replied: 0, bounced: 0, unsubscribed: 0 };
}

export function buildStats(byStatus: Record<LeadStatus, number>): Stats {
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  const contacted = byStatus.sent + byStatus.replied + byStatus.bounced;
  const rate = (n: number) => (contacted === 0 ? 0 : Math.round((n / contacted) * 10000) / 100);
  return {
    total,
    byStatus,
    replyRate: rate(byStatus.replied),
    bounceRate: rate(byStatus.bounced),
  };
}
