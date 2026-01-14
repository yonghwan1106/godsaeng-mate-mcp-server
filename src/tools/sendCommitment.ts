/**
 * godsaeng_send_commitment tool implementation
 * Send commitment card to Kakao Talk "나에게 보내기"
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SendCommitmentInputSchema, type SendCommitmentInput } from "../schemas/index.js";
import {
  sendCommitmentCard,
  getRandomEncouragement,
  formatSendCommitmentResult,
} from "../services/index.js";
import type { SendCommitmentOutput } from "../types.js";

const TOOL_NAME = "godsaeng_send_commitment";
const TOOL_TITLE = "Send Commitment Card";
const TOOL_DESCRIPTION = `Send a commitment card to Kakao Talk "나에게 보내기" (Send to Me).

This tool helps users make a commitment by sending a motivational card to their own Kakao Talk chat, reinforcing their "God-saeng" goals.

**IMPORTANT**: This tool requires OAuth authentication. The access token must be provided via the request context (PlayMCP handles this automatically).

Args:
  - goal (string): Today's goal (e.g., '자격증 공부 2시간', '헬스장에서 운동 1시간')
  - location_name (string, optional): Name of the location where you'll achieve the goal
  - location_url (string, optional): Kakao Map URL for the location
  - encouragement (string, optional): Custom encouragement message (default: random positive message)
  - template_type ('feed' | 'text'): Message template type (default: 'feed')

Returns:
  Confirmation of message sent to Kakao Talk.

Examples:
  - "오늘 자격증 공부 2시간 하겠다고 다짐 카드 보내줘" -> goal="자격증 공부 2시간"
  - "북카페 콤마에서 공부하겠다고 메시지 보내줘" -> goal="공부", location_name="북카페 콤마"

Required OAuth Scope: talk_message`;

export function registerSendCommitmentTool(server: McpServer): void {
  server.tool(
    TOOL_NAME,
    TOOL_DESCRIPTION,
    SendCommitmentInputSchema.shape,
    async (params: unknown) => {
      try {
        const input = SendCommitmentInputSchema.parse(params) as SendCommitmentInput;

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

        const encouragement = input.encouragement || getRandomEncouragement();

        const result = await sendCommitmentCard(accessToken, input.goal, {
          locationName: input.location_name,
          locationUrl: input.location_url,
          encouragement: encouragement,
          templateType: input.template_type,
        });

        const output: SendCommitmentOutput = {
          success: result.success,
          goal: input.goal,
          location: input.location_name,
          encouragement: encouragement,
          message: result.message,
        };

        const formattedResult = formatSendCommitmentResult(output, "markdown");

        return {
          content: [{ type: "text" as const, text: formattedResult }],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";

        const output: SendCommitmentOutput = {
          success: false,
          goal: "",
          encouragement: "",
          message: errorMessage,
        };

        return {
          content: [
            { type: "text" as const, text: formatSendCommitmentResult(output, "markdown") },
          ],
          isError: true,
        };
      }
    }
  );
}
