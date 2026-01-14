/**
 * Zod schema for godsaeng_search_spot tool
 */
import { z } from "zod";
import { ResponseFormatSchema } from "./common.js";

export const PurposeSchema = z
  .enum(["study", "exercise", "reading", "work"])
  .describe(
    "Purpose of the productivity spot: 'study' for cafes/study rooms, 'exercise' for gyms/fitness centers, 'reading' for book cafes/libraries, 'work' for coworking spaces"
  );

export const SearchSpotInputSchema = z
  .object({
    purpose: PurposeSchema,
    keyword: z
      .string()
      .max(100)
      .optional()
      .describe("Additional search keyword (e.g., '24시간', '조용한')"),
    location: z
      .string()
      .min(1, "Location is required")
      .max(100)
      .describe("Location to search around (e.g., '홍대입구역', '강남역', '서울시 마포구')"),
    radius: z
      .number()
      .int()
      .min(100)
      .max(20000)
      .default(500)
      .describe("Search radius in meters (default: 500, max: 20000)"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(15)
      .default(5)
      .describe("Maximum number of results to return (default: 5, max: 15)"),
    response_format: ResponseFormatSchema,
  })
  .strict();

export type SearchSpotInput = z.infer<typeof SearchSpotInputSchema>;
