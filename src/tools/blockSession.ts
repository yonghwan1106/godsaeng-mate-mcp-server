/**
 * godsaeng_block_session tool implementation
 * Block focus time on Kakao Talk Calendar
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BlockSessionInputSchema, type BlockSessionInput } from "../schemas/index.js";
import {
  createCalendarEvent,
  formatDateTime,
  formatBlockSessionResult,
} from "../services/index.js";
import type { BlockSessionOutput } from "../types.js";

const TOOL_NAME = "godsaeng_block_session";
const TOOL_TITLE = "Block Focus Session";
const TOOL_DESCRIPTION = `Create a focus session event in Kakao Talk Calendar.

This tool helps users block dedicated time for their "God-saeng" activities by creating calendar events with reminders.

**IMPORTANT**: This tool requires OAuth authentication. The access token must be provided via the request context (PlayMCP handles this automatically).

Args:
  - title (string): Event title (e.g., '자격증 공부', '헬스장 운동')
  - location_name (string, optional): Name of the location
  - location_address (string, optional): Address of the location
  - start_time (string): Start time in ISO 8601 format (e.g., '2026-01-15T19:00:00')
  - duration_minutes (number): Duration in minutes (15-480)
  - reminder_minutes (number): Reminder before event in minutes (default: 15)
  - color (string): Calendar color - BLUE, RED, YELLOW, GREEN, PINK, ORANGE, PURPLE, GRAY (default: BLUE)

Returns:
  Confirmation of calendar event creation with event details.

Examples:
  - "오늘 저녁 7시부터 2시간 공부 일정 잡아줘" -> title="공부", start_time="2026-01-15T19:00:00", duration_minutes=120
  - "내일 아침 6시 헬스장 운동 일정" -> title="헬스장 운동", start_time="2026-01-16T06:00:00"

Required OAuth Scope: talk_calendar`;

export function registerBlockSessionTool(server: McpServer): void {
  server.tool(
    TOOL_NAME,
    TOOL_DESCRIPTION,
    BlockSessionInputSchema.shape,
    async (params: unknown) => {
      try {
        const input = BlockSessionInputSchema.parse(params) as BlockSessionInput;

        // Get access token from environment (PlayMCP provides via environment or headers)
        const accessToken = process.env.KAKAO_ACCESS_TOKEN;

        if (!accessToken) {
          return {
            content: [
              {
                type: "text" as const,
                text: "오류: 카카오 로그인이 필요합니다. PlayMCP에서 카카오 계정으로 로그인해주세요.",
              },
            ],
            isError: true,
          };
        }

        // Calculate end time for display
        const startDate = new Date(input.start_time);
        const endDate = new Date(
          startDate.getTime() + input.duration_minutes * 60 * 1000
        );

        const result = await createCalendarEvent(accessToken, input.title, input.start_time, input.duration_minutes, {
          locationName: input.location_name,
          locationAddress: input.location_address,
          reminderMinutes: input.reminder_minutes,
          color: input.color,
          description: `갓생 메이트로 등록한 일정입니다.\n\n목표: ${input.title}`,
        });

        const output: BlockSessionOutput = {
          success: true,
          eventId: result.event_id,
          title: input.title,
          startTime: formatDateTime(input.start_time),
          endTime: formatDateTime(endDate.toISOString()),
          location: input.location_name,
          reminder: input.reminder_minutes,
          message: "톡캘린더에 일정이 등록되었습니다!",
        };

        const formattedResult = formatBlockSessionResult(output, "markdown");

        return {
          content: [{ type: "text" as const, text: formattedResult }],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";

        const output: BlockSessionOutput = {
          success: false,
          title: "",
          startTime: "",
          endTime: "",
          reminder: 0,
          message: errorMessage,
        };

        return {
          content: [
            { type: "text" as const, text: formatBlockSessionResult(output, "markdown") },
          ],
          isError: true,
        };
      }
    }
  );
}
