import mysql, { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";
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

interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

const toIso = (d: Date | string) => new Date(d).toISOString();

const mapCampaign = (r: RowDataPacket): Campaign => ({
  id: r.id,
  name: r.name,
  subject: r.subject,
  status: r.status,
  createdAt: toIso(r.created_at),
});

const mapLead = (r: RowDataPacket): Lead => ({
  id: r.id,
  campaignId: r.campaign_id,
  email: r.email,
  firstName: r.first_name,
  company: r.company,
  status: r.status,
  createdAt: toIso(r.created_at),
});

export class MySqlRepository implements Repository {
  private pool: Pool;

  constructor(cfg: DbConfig) {
    this.pool = mysql.createPool({ ...cfg, connectionLimit: 10, waitForConnections: true });
  }

  async ping(): Promise<void> {
    await this.pool.query("SELECT 1");
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async createCampaign(input: { name: string; subject: string }): Promise<Campaign> {
    const [res] = await this.pool.execute<ResultSetHeader>(
      "INSERT INTO campaigns (name, subject) VALUES (?, ?)",
      [input.name, input.subject]
    );
    return (await this.getCampaign(res.insertId))!;
  }

  async listCampaigns(page: number, limit: number): Promise<Page<Campaign>> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      "SELECT * FROM campaigns ORDER BY id DESC LIMIT ? OFFSET ?",
      [limit, (page - 1) * limit]
    );
    const [[count]] = await this.pool.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM campaigns");
    return { items: rows.map(mapCampaign), total: Number(count.total) };
  }

  async getCampaign(id: number): Promise<Campaign | null> {
    const [rows] = await this.pool.execute<RowDataPacket[]>("SELECT * FROM campaigns WHERE id = ?", [id]);
    return rows[0] ? mapCampaign(rows[0]) : null;
  }

  async updateCampaignStatus(id: number, status: CampaignStatus): Promise<Campaign | null> {
    await this.pool.execute("UPDATE campaigns SET status = ? WHERE id = ?", [status, id]);
    return this.getCampaign(id);
  }

  async addLeads(campaignId: number, leads: NewLead[]) {
    if (leads.length === 0) return { inserted: 0, skipped: 0 };
    const values = leads.map((l) => [
      campaignId,
      l.email.toLowerCase(),
      l.firstName ?? null,
      l.company ?? null,
    ]);
    // INSERT IGNORE + the (campaign_id, email) unique key = safe, idempotent bulk import.
    const [res] = await this.pool.query<ResultSetHeader>(
      "INSERT IGNORE INTO leads (campaign_id, email, first_name, company) VALUES ?",
      [values]
    );
    return { inserted: res.affectedRows, skipped: leads.length - res.affectedRows };
  }

  async listLeads(campaignId: number, opts: { page: number; limit: number; status?: LeadStatus }) {
    const where = opts.status ? "campaign_id = ? AND status = ?" : "campaign_id = ?";
    const params: (number | string)[] = opts.status ? [campaignId, opts.status] : [campaignId];
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT * FROM leads WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, opts.limit, (opts.page - 1) * opts.limit]
    );
    const [[count]] = await this.pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM leads WHERE ${where}`,
      params
    );
    return { items: rows.map(mapLead), total: Number(count.total) };
  }

  async updateLeadStatus(id: number, status: LeadStatus): Promise<Lead | null> {
    await this.pool.execute("UPDATE leads SET status = ? WHERE id = ?", [status, id]);
    const [rows] = await this.pool.execute<RowDataPacket[]>("SELECT * FROM leads WHERE id = ?", [id]);
    return rows[0] ? mapLead(rows[0]) : null;
  }

  async getStats(campaignId: number): Promise<Stats> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      "SELECT status, COUNT(*) AS n FROM leads WHERE campaign_id = ? GROUP BY status",
      [campaignId]
    );
    const counts = emptyCounts();
    for (const r of rows) counts[r.status as LeadStatus] = Number(r.n);
    return buildStats(counts);
  }
}
