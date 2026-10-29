import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { apiKeyAuth, asyncHandler, errorHandler, HttpError, notFound } from "./middleware";
import { openApiSpec } from "./openapi";
import { Repository } from "./repository";
import {
  addLeadsSchema,
  createCampaignSchema,
  idParamSchema,
  leadListQuerySchema,
  paginationSchema,
  updateCampaignStatusSchema,
  updateLeadStatusSchema,
} from "./schemas";

export interface AppOptions {
  apiKey?: string;
  corsOrigin?: string;
  /** Disable rate limiting (tests). */
  rateLimit?: boolean;
}

export function createApp(repo: Repository, opts: AppOptions = {}) {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: opts.corsOrigin ?? "*" }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.get("/openapi.json", (_req, res) => res.json(openApiSpec));

  const api = express.Router();
  if (opts.rateLimit !== false) {
    api.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));
  }
  api.use(apiKeyAuth(opts.apiKey ?? ""));

  // ---- Campaigns ----
  api.post(
    "/campaigns",
    asyncHandler(async (req, res) => {
      const body = createCampaignSchema.parse(req.body);
      res.status(201).json(await repo.createCampaign(body));
    })
  );

  api.get(
    "/campaigns",
    asyncHandler(async (req, res) => {
      const { page, limit } = paginationSchema.parse(req.query);
      const { items, total } = await repo.listCampaigns(page, limit);
      res.json({ items, total, page, limit });
    })
  );

  api.get(
    "/campaigns/:id",
    asyncHandler(async (req, res) => {
      const { id } = idParamSchema.parse(req.params);
      const campaign = await repo.getCampaign(id);
      if (!campaign) throw new HttpError(404, "Campaign not found");
      res.json({ ...campaign, stats: await repo.getStats(id) });
    })
  );

  api.patch(
    "/campaigns/:id/status",
    asyncHandler(async (req, res) => {
      const { id } = idParamSchema.parse(req.params);
      const { status } = updateCampaignStatusSchema.parse(req.body);
      const updated = await repo.updateCampaignStatus(id, status);
      if (!updated) throw new HttpError(404, "Campaign not found");
      res.json(updated);
    })
  );

  api.get(
    "/campaigns/:id/stats",
    asyncHandler(async (req, res) => {
      const { id } = idParamSchema.parse(req.params);
      if (!(await repo.getCampaign(id))) throw new HttpError(404, "Campaign not found");
      res.json(await repo.getStats(id));
    })
  );

  // ---- Leads ----
  api.post(
    "/campaigns/:id/leads",
    asyncHandler(async (req, res) => {
      const { id } = idParamSchema.parse(req.params);
      const { leads } = addLeadsSchema.parse(req.body);
      if (!(await repo.getCampaign(id))) throw new HttpError(404, "Campaign not found");
      res.status(201).json(await repo.addLeads(id, leads));
    })
  );

  api.get(
    "/campaigns/:id/leads",
    asyncHandler(async (req, res) => {
      const { id } = idParamSchema.parse(req.params);
      const query = leadListQuerySchema.parse(req.query);
      if (!(await repo.getCampaign(id))) throw new HttpError(404, "Campaign not found");
      const { items, total } = await repo.listLeads(id, query);
      res.json({ items, total, page: query.page, limit: query.limit });
    })
  );

  api.patch(
    "/leads/:id/status",
    asyncHandler(async (req, res) => {
      const { id } = idParamSchema.parse(req.params);
      const { status } = updateLeadStatusSchema.parse(req.body);
      const updated = await repo.updateLeadStatus(id, status);
      if (!updated) throw new HttpError(404, "Lead not found");
      res.json(updated);
    })
  );

  app.use("/api", api);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
