/**
 * Vercel Serverless Handler for Godsaeng Mate MCP Server
 *
 * Handles MCP requests via stateless JSON-RPC for PlayMCP integration.
 * Uses direct JSON-RPC handling (no transport layer) for Vercel compatibility.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { SearchSpotInputSchema, type SearchSpotInput } from "../src/schemas/searchSpot.js";
import { BlockSessionInputSchema, type BlockSessionInput } from "../src/schemas/blockSession.js";
import { SendCommitmentInputSchema, type SendCommitmentInput } from "../src/schemas/sendCommitment.js";
import {
  searchPlaces,
  coordinateLookup,
  formatSearchSpotResult,
} from "../src/services/kakaoLocalApi.js";
import {
  createCalendarEvent,
  formatDateTime,
  formatBlockSessionResult,
} from "../src/services/kakaoCalendarApi.js";
import {
  sendCommitmentCard,
  getRandomEncouragement,
  formatSendCommitmentResult,
} from "../src/services/kakaoMessageApi.js";
import { PURPOSE_CATEGORY_MAP, PURPOSE_KEYWORDS } from "../src/constants.js";
import type { SearchSpotOutput, BlockSessionOutput, SendCommitmentOutput } from "../src/types.js";

// Server metadata
const SERVER_INFO = {
  name: "godsaeng-mate-mcp-server",
  version: "1.0.0",
};

// Tool definitions for MCP
const TOOLS = [
  {
    name: "godsaeng_search_spot",
    description: `Search for productivity spots (cafes, gyms, co-working spaces) based on purpose.

This tool helps users find the best places for their "God-saeng" activities like studying, exercising, reading, or working.

Args:
  - purpose: "study" | "exercise" | "reading" | "work" - What you want to do
  - location: string - Location to search near (e.g., "홍대입구역", "강남역")
  - keyword (optional): Additional search keyword
  - radius (optional): Search radius in meters (default: 500, max: 20000)
  - limit (optional): Number of results (default: 5, max: 15)

Examples:
  - "홍대 근처 공부할 카페 찾아줘" -> purpose="study", location="홍대입구역"
  - "강남역 주변 헬스장" -> purpose="exercise", location="강남역"`,
    inputSchema: {
      type: "object",
      properties: {
        purpose: {
          type: "string",
          enum: ["study", "exercise", "reading", "work"],
          description: "Purpose of visit: study (카페/스터디), exercise (헬스장/운동), reading (북카페), work (코워킹스페이스)",
        },
        location: {
          type: "string",
          description: "Location to search near (e.g., '홍대입구역', '강남역')",
        },
        keyword: {
          type: "string",
          description: "Additional search keyword (optional)",
        },
        radius: {
          type: "number",
          description: "Search radius in meters (default: 500, max: 20000)",
        },
        limit: {
          type: "number",
          description: "Number of results to return (default: 5, max: 15)",
        },
        response_format: {
          type: "string",
          enum: ["markdown", "json"],
          description: "Response format (default: markdown)",
        },
      },
      required: ["purpose", "location"],
    },
  },
  {
    name: "godsaeng_block_session",
    description: `Create a focus session event in Kakao Talk Calendar.

This tool helps users block dedicated time for their "God-saeng" activities by creating calendar events with reminders.

**IMPORTANT**: This tool requires OAuth authentication. The access token must be provided via the request context.

Args:
  - title: string - Event title (e.g., "자격증 공부", "헬스장 운동")
  - start_time: string - Start time in ISO 8601 format (e.g., "2026-01-15T19:00:00")
  - duration_minutes: number - Duration in minutes (15-480)
  - location_name (optional): Name of the location
  - location_address (optional): Address of the location
  - reminder_minutes (optional): Reminder before event (default: 15)
  - color (optional): Calendar color - BLUE, RED, YELLOW, GREEN, PINK, ORANGE, PURPLE, GRAY

Examples:
  - "오늘 저녁 7시부터 2시간 공부 일정" -> title="공부", start_time="2026-01-15T19:00:00", duration_minutes=120`,
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Event title",
        },
        start_time: {
          type: "string",
          description: "Start time in ISO 8601 format",
        },
        duration_minutes: {
          type: "number",
          description: "Duration in minutes (15-480)",
        },
        location_name: {
          type: "string",
          description: "Name of the location (optional)",
        },
        location_address: {
          type: "string",
          description: "Address of the location (optional)",
        },
        reminder_minutes: {
          type: "number",
          description: "Reminder before event in minutes (default: 15)",
        },
        color: {
          type: "string",
          enum: ["BLUE", "RED", "YELLOW", "GREEN", "PINK", "ORANGE", "PURPLE", "GRAY"],
          description: "Calendar event color (default: BLUE)",
        },
      },
      required: ["title", "start_time", "duration_minutes"],
    },
  },
  {
    name: "godsaeng_send_commitment",
    description: `Send a commitment card to Kakao Talk "나에게 보내기" (Send to Me).

This tool helps users make a commitment by sending a motivational card to their own Kakao Talk chat.

**IMPORTANT**: This tool requires OAuth authentication. The access token must be provided via the request context.

Args:
  - goal: string - Today's goal (e.g., "자격증 공부 2시간", "헬스장에서 운동 1시간")
  - location_name (optional): Name of the location
  - location_url (optional): Kakao Map URL for the location
  - encouragement (optional): Custom encouragement message
  - template_type (optional): "feed" | "text" (default: "feed")

Examples:
  - "오늘 자격증 공부 2시간 하겠다고 다짐 카드 보내줘" -> goal="자격증 공부 2시간"`,
    inputSchema: {
      type: "object",
      properties: {
        goal: {
          type: "string",
          description: "Today's goal",
        },
        location_name: {
          type: "string",
          description: "Name of the location (optional)",
        },
        location_url: {
          type: "string",
          description: "Kakao Map URL for the location (optional)",
        },
        encouragement: {
          type: "string",
          description: "Custom encouragement message (optional)",
        },
        template_type: {
          type: "string",
          enum: ["feed", "text"],
          description: "Message template type (default: feed)",
        },
      },
      required: ["goal"],
    },
  },
];

// ===== Tool Execution Functions =====

async function executeSearchSpot(args: SearchSpotInput): Promise<string> {
  const format = args.response_format || "markdown";

  try {
    // Get coordinates for the location
    const coords = await coordinateLookup(args.location);

    // Build search query based on purpose
    const purposeKeyword = PURPOSE_KEYWORDS[args.purpose] || "";
    const searchQuery = args.keyword
      ? `${args.keyword} ${purposeKeyword}`.trim()
      : purposeKeyword;

    // Search for places
    const places = await searchPlaces(
      searchQuery,
      coords.longitude,
      coords.latitude,
      {
        radius: args.radius || 500,
        size: args.limit || 5,
        categoryGroupCode: PURPOSE_CATEGORY_MAP[args.purpose],
      }
    );

    const result: SearchSpotOutput = {
      purpose: args.purpose,
      location: args.location,
      count: places.length,
      places: places.map((place) => ({
        name: place.place_name,
        address: place.road_address_name || place.address_name,
        distance: place.distance,
        phone: place.phone || undefined,
        url: place.place_url,
        category: place.category_name,
      })),
    };

    return formatSearchSpotResult(result, format);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
    return `❌ 장소 검색 실패: ${errorMessage}`;
  }
}

async function executeBlockSession(args: BlockSessionInput): Promise<string> {
  const accessToken = process.env.KAKAO_ACCESS_TOKEN;

  if (!accessToken) {
    return "❌ 오류: 카카오 로그인이 필요합니다. PlayMCP에서 카카오 계정으로 로그인해주세요.";
  }

  try {
    const startDate = new Date(args.start_time);
    const endDate = new Date(startDate.getTime() + args.duration_minutes * 60 * 1000);

    const result = await createCalendarEvent(accessToken, args.title, args.start_time, args.duration_minutes, {
      locationName: args.location_name,
      locationAddress: args.location_address,
      reminderMinutes: args.reminder_minutes,
      color: args.color,
      description: `갓생 메이트로 등록한 일정입니다.\n\n목표: ${args.title}`,
    });

    const output: BlockSessionOutput = {
      success: true,
      eventId: result.event_id,
      title: args.title,
      startTime: formatDateTime(args.start_time),
      endTime: formatDateTime(endDate.toISOString()),
      location: args.location_name,
      reminder: args.reminder_minutes,
      message: "톡캘린더에 일정이 등록되었습니다!",
    };

    return formatBlockSessionResult(output, "markdown");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
    return `❌ 일정 등록 실패: ${errorMessage}`;
  }
}

async function executeSendCommitment(args: SendCommitmentInput): Promise<string> {
  const accessToken = process.env.KAKAO_ACCESS_TOKEN;

  if (!accessToken) {
    return "❌ 오류: 카카오 로그인이 필요합니다. PlayMCP에서 카카오 계정으로 로그인해주세요.";
  }

  try {
    const encouragement = args.encouragement || getRandomEncouragement();

    const result = await sendCommitmentCard(accessToken, args.goal, {
      locationName: args.location_name,
      locationUrl: args.location_url,
      encouragement: encouragement,
      templateType: args.template_type,
    });

    const output: SendCommitmentOutput = {
      success: result.success,
      goal: args.goal,
      location: args.location_name,
      encouragement: encouragement,
      message: result.message,
    };

    return formatSendCommitmentResult(output, "markdown");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
    return `❌ 메시지 전송 실패: ${errorMessage}`;
  }
}

async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "godsaeng_search_spot": {
      const parsed = SearchSpotInputSchema.safeParse(args);
      if (!parsed.success) {
        return `❌ 입력 오류: ${parsed.error.message}`;
      }
      return executeSearchSpot(parsed.data);
    }
    case "godsaeng_block_session": {
      const parsed = BlockSessionInputSchema.safeParse(args);
      if (!parsed.success) {
        return `❌ 입력 오류: ${parsed.error.message}`;
      }
      return executeBlockSession(parsed.data);
    }
    case "godsaeng_send_commitment": {
      const parsed = SendCommitmentInputSchema.safeParse(args);
      if (!parsed.success) {
        return `❌ 입력 오류: ${parsed.error.message}`;
      }
      return executeSendCommitment(parsed.data);
    }
    default:
      return `❌ 알 수 없는 도구: ${name}`;
  }
}

// ===== JSON-RPC Helpers =====

function jsonRpcResponse(id: string | number | null, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function jsonRpcError(id: string | number | null, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

// ===== Vercel Handler =====

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id, x-session-id, Accept, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Path check
  const urlPath = req.url?.split("?")[0] || "/";

  // Landing page (root path) - serve static file
  if (req.method === "GET" && (urlPath === "/" || urlPath === "")) {
    // Redirect to static index.html
    res.setHeader("Location", "/public/index.html");
    return res.status(302).end();
  }

  // Health check
  if (req.method === "GET" && urlPath === "/health") {
    return res.status(200).json({
      status: "ok",
      server: SERVER_INFO.name,
      version: SERVER_INFO.version,
      timestamp: new Date().toISOString(),
      tools: TOOLS.map((t) => t.name),
    });
  }

  // MCP JSON-RPC endpoint
  if (req.method === "POST" && (urlPath === "/mcp" || urlPath === "/api" || urlPath === "/api/")) {
    try {
      const body = req.body;
      const { jsonrpc, id, method, params } = body;

      if (jsonrpc !== "2.0") {
        return res.status(400).json(jsonRpcError(id, -32600, "Invalid JSON-RPC version"));
      }

      let result: unknown;

      switch (method) {
        case "initialize":
          result = {
            protocolVersion: params?.protocolVersion || "2024-11-05",
            capabilities: {
              tools: { listChanged: false },
            },
            serverInfo: SERVER_INFO,
          };
          break;

        case "notifications/initialized":
          return res.status(200).end();

        case "tools/list":
          result = { tools: TOOLS };
          break;

        case "tools/call": {
          const toolName = params?.name;
          const toolArgs = params?.arguments || {};

          if (!toolName) {
            return res.status(400).json(jsonRpcError(id, -32602, "Missing tool name"));
          }

          const tool = TOOLS.find((t) => t.name === toolName);
          if (!tool) {
            return res.status(400).json(jsonRpcError(id, -32602, `Unknown tool: ${toolName}`));
          }

          const toolResult = await executeTool(toolName, toolArgs);
          result = {
            content: [{ type: "text", text: toolResult }],
          };
          break;
        }

        case "ping":
          result = {};
          break;

        default:
          return res.status(400).json(jsonRpcError(id, -32601, `Method not found: ${method}`));
      }

      return res.status(200).json(jsonRpcResponse(id, result));
    } catch (error) {
      console.error("MCP Error:", error);
      return res.status(500).json(jsonRpcError(null, -32603, getErrorMessage(error)));
    }
  }

  // DELETE for session cleanup
  if (req.method === "DELETE") {
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
