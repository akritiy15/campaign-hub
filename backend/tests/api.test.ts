import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { MemoryRepository } from "../src/memoryRepository";

let app: ReturnType<typeof createApp>;

beforeEach(() => {
  app = createApp(new MemoryRepository(), { rateLimit: false });
});

const newCampaign = async () =>
  (await request(app).post("/api/campaigns").send({ name: "Q4 Outreach", subject: "Quick question" })).body;

describe("campaigns", () => {
  it("creates a campaign in draft status", async () => {
    const res = await request(app).post("/api/campaigns").send({ name: "Q4 Outreach", subject: "Hi" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 1, name: "Q4 Outreach", status: "draft" });
  });

  it("rejects invalid input with 400 and details", async () => {
    const res = await request(app).post("/api/campaigns").send({ name: "" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  it("lists campaigns with pagination", async () => {
    for (let i = 0; i < 3; i++) await newCampaign();
    const res = await request(app).get("/api/campaigns?page=1&limit=2");
    expect(res.body.items).toHaveLength(2);
    expect(res.body.total).toBe(3);
  });

  it("returns 404 for an unknown campaign", async () => {
    const res = await request(app).get("/api/campaigns/999");
    expect(res.status).toBe(404);
  });

  it("updates campaign status", async () => {
    const c = await newCampaign();
    const res = await request(app).patch(`/api/campaigns/${c.id}/status`).send({ status: "active" });
    expect(res.body.status).toBe("active");
    const bad = await request(app).patch(`/api/campaigns/${c.id}/status`).send({ status: "nope" });
    expect(bad.status).toBe(400);
  });
});

describe("leads", () => {
  it("bulk-adds leads and skips duplicates (case-insensitive)", async () => {
    const c = await newCampaign();
    const res = await request(app)
      .post(`/api/campaigns/${c.id}/leads`)
      .send({
        leads: [
          { email: "a@acme.com", firstName: "Ana" },
          { email: "A@acme.com" },
          { email: "b@acme.com", company: "Acme" },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ inserted: 2, skipped: 1 });
  });

  it("rejects malformed emails", async () => {
    const c = await newCampaign();
    const res = await request(app).post(`/api/campaigns/${c.id}/leads`).send({ leads: [{ email: "not-an-email" }] });
    expect(res.status).toBe(400);
  });

  it("filters leads by status", async () => {
    const c = await newCampaign();
    await request(app)
      .post(`/api/campaigns/${c.id}/leads`)
      .send({ leads: [{ email: "a@x.com" }, { email: "b@x.com" }] });
    await request(app).patch("/api/leads/1/status").send({ status: "sent" });
    const res = await request(app).get(`/api/campaigns/${c.id}/leads?status=sent`);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].email).toBe("a@x.com");
  });

  it("404s when adding leads to a missing campaign", async () => {
    const res = await request(app).post("/api/campaigns/42/leads").send({ leads: [{ email: "a@x.com" }] });
    expect(res.status).toBe(404);
  });
});

describe("stats", () => {
  it("computes funnel counts and rates", async () => {
    const c = await newCampaign();
    await request(app)
      .post(`/api/campaigns/${c.id}/leads`)
      .send({ leads: ["a", "b", "c", "d", "e"].map((n) => ({ email: `${n}@x.com` })) });
    await request(app).patch("/api/leads/1/status").send({ status: "sent" });
    await request(app).patch("/api/leads/2/status").send({ status: "replied" });
    await request(app).patch("/api/leads/3/status").send({ status: "bounced" });
    await request(app).patch("/api/leads/4/status").send({ status: "sent" });

    const res = await request(app).get(`/api/campaigns/${c.id}/stats`);
    expect(res.body.total).toBe(5);
    expect(res.body.byStatus).toMatchObject({ pending: 1, sent: 2, replied: 1, bounced: 1 });
    // contacted = 4 → reply 25%, bounce 25%
    expect(res.body.replyRate).toBe(25);
    expect(res.body.bounceRate).toBe(25);
  });

  it("returns zero rates when nothing has been contacted", async () => {
    const c = await newCampaign();
    const res = await request(app).get(`/api/campaigns/${c.id}/stats`);
    expect(res.body.replyRate).toBe(0);
  });
});

describe("auth & misc", () => {
  it("enforces x-api-key when configured", async () => {
    const secured = createApp(new MemoryRepository(), { apiKey: "secret", rateLimit: false });
    expect((await request(secured).get("/api/campaigns")).status).toBe(401);
    expect((await request(secured).get("/api/campaigns").set("x-api-key", "secret")).status).toBe(200);
  });

  it("serves health and OpenAPI spec without auth", async () => {
    const secured = createApp(new MemoryRepository(), { apiKey: "secret", rateLimit: false });
    expect((await request(secured).get("/health")).body.status).toBe("ok");
    expect((await request(secured).get("/openapi.json")).body.openapi).toBe("3.0.3");
  });

  it("returns JSON 404 for unknown routes", async () => {
    const res = await request(app).get("/nope");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Route not found");
  });
});
