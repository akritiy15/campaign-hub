import { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Wraps async handlers so rejected promises reach the error middleware. */
export const asyncHandler =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

/** Optional API-key auth: only enforced when API_KEY is configured. */
export const apiKeyAuth =
  (apiKey: string): RequestHandler =>
  (req, _res, next) => {
    if (!apiKey) return next();
    if (req.header("x-api-key") !== apiKey) return next(new HttpError(401, "Invalid or missing API key"));
    next();
  };

export const notFound: RequestHandler = (_req, _res, next) => next(new HttpError(404, "Route not found"));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation failed",
      details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
};
