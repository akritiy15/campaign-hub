import {
  Campaign,
  CampaignStatus,
  Lead,
  LeadStatus,
  NewLead,
  Page,
  Repository,
  Stats,
  buildStats,
  emptyCounts,
} from "./repository";

/** In-memory implementation used by the test suite (no database needed). */
export class MemoryRepository implements Repository {
  private campaigns: Campaign[] = [];
  private leads: Lead[] = [];
  private campaignSeq = 1;
  private leadSeq = 1;

  async createCampaign(input: { name: string; subject: string }): Promise<Campaign> {
    const campaign: Campaign = {
      id: this.campaignSeq++,
      name: input.name,
      subject: input.subject,
      status: "draft",
      createdAt: new Date().toISOString(),
    };
    this.campaigns.push(campaign);
    return campaign;
  }

  async listCampaigns(page: number, limit: number): Promise<Page<Campaign>> {
    const sorted = [...this.campaigns].sort((a, b) => b.id - a.id);
    return { items: sorted.slice((page - 1) * limit, page * limit), total: sorted.length };
  }

  async getCampaign(id: number): Promise<Campaign | null> {
    return this.campaigns.find((c) => c.id === id) ?? null;
  }

  async updateCampaignStatus(id: number, status: CampaignStatus): Promise<Campaign | null> {
    const campaign = await this.getCampaign(id);
    if (!campaign) return null;
    campaign.status = status;
    return campaign;
  }

  async addLeads(campaignId: number, leads: NewLead[]) {
    let inserted = 0;
    let skipped = 0;
    for (const l of leads) {
      const email = l.email.toLowerCase();
      if (this.leads.some((x) => x.campaignId === campaignId && x.email === email)) {
        skipped++;
        continue;
      }
      this.leads.push({
        id: this.leadSeq++,
        campaignId,
        email,
        firstName: l.firstName ?? null,
        company: l.company ?? null,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      inserted++;
    }
    return { inserted, skipped };
  }

  async listLeads(campaignId: number, opts: { page: number; limit: number; status?: LeadStatus }) {
    const filtered = this.leads
      .filter((l) => l.campaignId === campaignId && (!opts.status || l.status === opts.status))
      .sort((a, b) => b.id - a.id);
    return {
      items: filtered.slice((opts.page - 1) * opts.limit, opts.page * opts.limit),
      total: filtered.length,
    };
  }

  async updateLeadStatus(id: number, status: LeadStatus): Promise<Lead | null> {
    const lead = this.leads.find((l) => l.id === id);
    if (!lead) return null;
    lead.status = status;
    return lead;
  }

  async getStats(campaignId: number): Promise<Stats> {
    const counts = emptyCounts();
    for (const l of this.leads) if (l.campaignId === campaignId) counts[l.status]++;
    return buildStats(counts);
  }
}
