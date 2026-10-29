import { z } from "zod";
import { CAMPAIGN_STATUSES, LEAD_STATUSES } from "./repository";

export const createCampaignSchema = z.object({
  name: z.string().trim().min(1).max(120),
  subject: z.string().trim().min(1).max(200),
});

export const updateCampaignStatusSchema = z.object({
  status: z.enum(CAMPAIGN_STATUSES),
});

export const addLeadsSchema = z.object({
  leads: z
    .array(
      z.object({
        email: z.string().trim().email().max(254),
        firstName: z.string().trim().max(80).optional().nullable(),
        company: z.string().trim().max(120).optional().nullable(),
      })
    )
    .min(1)
    .max(1000),
});

export const updateLeadStatusSchema = z.object({
  status: z.enum(LEAD_STATUSES),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const leadListQuerySchema = paginationSchema.extend({
  status: z.enum(LEAD_STATUSES).optional(),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
