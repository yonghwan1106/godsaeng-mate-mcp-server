/**
 * godsaeng_search_spot tool implementation
 * Search for productivity spots based on purpose and location
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SearchSpotInputSchema, type SearchSpotInput } from "../schemas/index.js";
import { searchProductivitySpots, formatSearchSpotResult } from "../services/index.js";
import type { SearchSpotOutput } from "../types.js";

const TOOL_NAME = "godsaeng_search_spot";
const TOOL_TITLE = "Search Productivity Spot";
const TOOL_DESCRIPTION = `Search for productivity spots (cafes, gyms, coworking spaces) based on purpose and location.

This tool helps users find the best places for their "God-saeng" (productive life) goals using Kakao Local API.

Args:
  - purpose (string): Type of activity - 'study' (cafes/study rooms), 'exercise' (gyms), 'reading' (book cafes), 'work' (coworking spaces)
  - keyword (string, optional): Additional search keyword (e.g., '24시간', '조용한')
  - location (string): Location to search around (e.g., '홍대입구역', '강남역')
  - radius (number): Search radius in meters (default: 500, max: 20000)
  - limit (number): Maximum results (default: 5, max: 15)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  List of places with name, address, distance, phone, and Kakao Map URL.

Examples:
  - "홍대역 근처 스터디카페 찾아줘" -> purpose="study", location="홍대역"
  - "강남역 주변 헬스장" -> purpose="exercise", location="강남역"
  - "서울시청 근처 코워킹스페이스" -> purpose="work", location="서울시청"`;

export function registerSearchSpotTool(server: McpServer): void {
  server.tool(
    TOOL_NAME,
    TOOL_DESCRIPTION,
    SearchSpotInputSchema.shape,
    async (params: unknown) => {
      try {
        const input = SearchSpotInputSchema.parse(params) as SearchSpotInput;

        const result = await searchProductivitySpots(
          input.purpose,
          input.location,
          input.keyword,
          input.radius,
          input.limit
        );

        const output: SearchSpotOutput = {
          query: result.query,
          purpose: input.purpose,
          location: input.location,
          total: result.total,
          places: result.places,
        };

        const formattedResult = formatSearchSpotResult(
          output,
          input.response_format
        );

        return {
          content: [{ type: "text" as const, text: formattedResult }],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
        return {
          content: [{ type: "text" as const, text: `오류: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );
}
