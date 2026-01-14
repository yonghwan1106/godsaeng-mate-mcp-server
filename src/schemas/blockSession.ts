/**
 * Zod schema for godsaeng_block_session tool
 */
import { z } from "zod";

export const CalendarColorSchema = z
  .enum(["BLUE", "RED", "YELLOW", "GREEN", "PINK", "ORANGE", "PURPLE", "GRAY"])
  .default("BLUE")
  .describe("Calendar event color");

export const BlockSessionInputSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(50, "Title must not exceed 50 characters")
      .describe("Event title (e.g., '자격증 공부', '헬스장 운동')"),
    location_name: z
      .string()
      .max(100)
      .optional()
      .describe("Name of the location (e.g., '북카페 콤마')"),
    location_address: z
      .string()
      .max(200)
      .optional()
      .describe("Address of the location"),
    start_time: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})?$/,
        "Invalid ISO 8601 datetime format (e.g., '2026-01-15T19:00:00')"
      )
      .describe("Start time in ISO 8601 format (e.g., '2026-01-15T19:00:00')"),
    duration_minutes: z
      .number()
      .int()
      .min(15, "Duration must be at least 15 minutes")
      .max(480, "Duration cannot exceed 8 hours (480 minutes)")
      .describe("Duration in minutes (e.g., 120 for 2 hours)"),
    reminder_minutes: z
      .number()
      .int()
      .min(0)
      .max(1440)
      .default(15)
      .describe("Reminder time in minutes before the event (default: 15)"),
    color: CalendarColorSchema,
  })
  .strict();

export type BlockSessionInput = z.infer<typeof BlockSessionInputSchema>;
