/**
 * Common Zod schemas shared across tools
 */
import { z } from "zod";

// Response format enum
export const ResponseFormatSchema = z
  .enum(["markdown", "json"])
  .default("markdown")
  .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable");

export type ResponseFormat = z.infer<typeof ResponseFormatSchema>;
