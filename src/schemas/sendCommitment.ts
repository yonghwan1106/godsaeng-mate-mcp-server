/**
 * Zod schema for godsaeng_send_commitment tool
 */
import { z } from "zod";

export const MessageTemplateTypeSchema = z
  .enum(["feed", "text"])
  .default("feed")
  .describe("Message template type: 'feed' for rich card with image, 'text' for simple text");

export const SendCommitmentInputSchema = z
  .object({
    goal: z
      .string()
      .min(1, "Goal is required")
      .max(200, "Goal must not exceed 200 characters")
      .describe("Today's goal (e.g., '자격증 공부 2시간', '헬스장에서 운동 1시간')"),
    location_name: z
      .string()
      .max(100)
      .optional()
      .describe("Name of the location where you'll achieve the goal"),
    location_url: z
      .string()
      .url("Invalid URL format")
      .optional()
      .describe("Kakao Map URL for the location (e.g., 'https://place.map.kakao.com/...')"),
    encouragement: z
      .string()
      .max(100)
      .optional()
      .describe("Custom encouragement message (default: random positive message)"),
    template_type: MessageTemplateTypeSchema,
  })
  .strict();

export type SendCommitmentInput = z.infer<typeof SendCommitmentInputSchema>;
