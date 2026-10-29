const idParam = { name: "id", in: "path", required: true, schema: { type: "integer" } };
const pageParams = [
  { name: "page", in: "query", schema: { type: "integer", default: 1 } },
  { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
];
const json = (schema: unknown) => ({ content: { "application/json": { schema } } });
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Campaign Hub API",
    version: "1.0.0",
    description:
      "Manage cold-outreach campaigns and leads. If the server has API_KEY set, send it in the `x-api-key` header.",
  },
  servers: [{ url: "/" }],
  components: {
    securitySchemes: { ApiKey: { type: "apiKey", in: "header", name: "x-api-key" } },
    schemas: {
      Campaign: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          subject: { type: "string" },
          status: { type: "string", enum: ["draft", "active", "paused", "completed"] },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Lead: {
        type: "object",
        properties: {
          id: { type: "integer" },
          campaignId: { type: "integer" },
          email: { type: "string", format: "email" },
          firstName: { type: "string", nullable: true },
          company: { type: "string", nullable: true },
          status: { type: "string", enum: ["pending", "sent", "replied", "bounced", "unsubscribed"] },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Stats: {
        type: "object",
        properties: {
          total: { type: "integer" },
          byStatus: { type: "object", additionalProperties: { type: "integer" } },
          replyRate: { type: "number", description: "Percent of contacted leads that replied" },
          bounceRate: { type: "number", description: "Percent of contacted leads that bounced" },
        },
      },
      Error: { type: "object", properties: { error: { type: "string" } } },
    },
  },
  security: [{ ApiKey: [] }],
  paths: {
    "/health": {
      get: { summary: "Health check", security: [], responses: { "200": { description: "OK" } } },
    },
    "/api/campaigns": {
      get: {
        summary: "List campaigns (paginated)",
        parameters: pageParams,
        responses: { "200": { description: "Page of campaigns" } },
      },
      post: {
        summary: "Create a campaign",
        requestBody: {
          required: true,
          ...json({
            type: "object",
            required: ["name", "subject"],
            properties: { name: { type: "string" }, subject: { type: "string" } },
          }),
        },
        responses: { "201": { description: "Created", ...json(ref("Campaign")) }, "400": { description: "Validation failed" } },
      },
    },
    "/api/campaigns/{id}": {
      get: {
        summary: "Get a campaign with its stats",
        parameters: [idParam],
        responses: { "200": { description: "Campaign + stats" }, "404": { description: "Not found" } },
      },
    },
    "/api/campaigns/{id}/status": {
      patch: {
        summary: "Change campaign status",
        parameters: [idParam],
        requestBody: {
          required: true,
          ...json({
            type: "object",
            required: ["status"],
            properties: { status: { type: "string", enum: ["draft", "active", "paused", "completed"] } },
          }),
        },
        responses: { "200": { description: "Updated", ...json(ref("Campaign")) }, "404": { description: "Not found" } },
      },
    },
    "/api/campaigns/{id}/leads": {
      get: {
        summary: "List leads in a campaign (filter by status)",
        parameters: [
          idParam,
          ...pageParams,
          { name: "status", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Page of leads" } },
      },
      post: {
        summary: "Bulk-add leads (duplicates per campaign are skipped)",
        parameters: [idParam],
        requestBody: {
          required: true,
          ...json({
            type: "object",
            required: ["leads"],
            properties: {
              leads: {
                type: "array",
                maxItems: 1000,
                items: {
                  type: "object",
                  required: ["email"],
                  properties: {
                    email: { type: "string" },
                    firstName: { type: "string" },
                    company: { type: "string" },
                  },
                },
              },
            },
          }),
        },
        responses: { "201": { description: "{ inserted, skipped }" }, "404": { description: "Campaign not found" } },
      },
    },
    "/api/campaigns/{id}/stats": {
      get: {
        summary: "Lead funnel stats for a campaign",
        parameters: [idParam],
        responses: { "200": { description: "Stats", ...json(ref("Stats")) } },
      },
    },
    "/api/leads/{id}/status": {
      patch: {
        summary: "Update a lead's status (e.g. sent, replied, bounced)",
        parameters: [idParam],
        requestBody: {
          required: true,
          ...json({
            type: "object",
            required: ["status"],
            properties: {
              status: { type: "string", enum: ["pending", "sent", "replied", "bounced", "unsubscribed"] },
            },
          }),
        },
        responses: { "200": { description: "Updated", ...json(ref("Lead")) }, "404": { description: "Not found" } },
      },
    },
  },
};
