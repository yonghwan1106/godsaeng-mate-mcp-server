/**
 * Godsaeng Mate MCP Server - Vercel Serverless Handler
 *
 * Self-contained MCP handler for PlayMCP integration.
 * All logic inline to avoid module resolution issues in Vercel.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

// ===== Type Definitions =====

interface KakaoPlace {
  place_name: string;
  address_name: string;
  road_address_name: string;
  phone: string;
  category_name: string;
  distance: string;
  place_url: string;
  x: string;
  y: string;
}

interface KakaoLocalResponse {
  documents: KakaoPlace[];
  meta: { total_count: number };
}

interface KakaoAddressDocument {
  x: string;
  y: string;
  address_name: string;
}

interface KakaoAddressResponse {
  documents: KakaoAddressDocument[];
}

type Purpose = "study" | "exercise" | "reading" | "work";

// ===== Constants =====

const SERVER_INFO = {
  name: "godsaeng-mate-mcp-server",
  version: "1.0.0",
};

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
const DEFAULT_TIMEOUT = 10000;
const CHARACTER_LIMIT = 25000;

const PURPOSE_CONFIG: Record<Purpose, { defaultKeyword: string; categoryCode: string | null }> = {
  study: { defaultKeyword: "스터디카페", categoryCode: "CE7" },
  exercise: { defaultKeyword: "헬스장", categoryCode: null },
  reading: { defaultKeyword: "북카페", categoryCode: "CE7" },
  work: { defaultKeyword: "코워킹스페이스", categoryCode: null },
};

const PURPOSE_LABELS: Record<Purpose, string> = {
  study: "공부",
  exercise: "운동",
  reading: "독서",
  work: "업무",
};

const ENCOURAGEMENT_MESSAGES = [
  "오늘 하루도 갓생 달성!",
  "작은 실천이 큰 변화를 만듭니다",
  "꾸준함이 실력이 됩니다",
  "오늘의 노력이 내일의 나를 만듭니다",
  "할 수 있다! 파이팅!",
  "시작이 반이다!",
  "포기하지 않는 당신이 멋집니다",
];

// ===== Tool Definitions =====

const TOOLS = [
  {
    name: "godsaeng_search_spot",
    description: `Search for productivity spots based on purpose.

Args:
  - purpose: "study" | "exercise" | "reading" | "work"
  - location: string - Location to search near (e.g., "홍대입구역")
  - keyword (optional): Additional search keyword
  - radius (optional): Search radius in meters (default: 500)
  - limit (optional): Number of results (default: 5)

Examples:
  - "홍대 근처 공부할 카페" -> purpose="study", location="홍대입구역"`,
    inputSchema: {
      type: "object",
      properties: {
        purpose: {
          type: "string",
          enum: ["study", "exercise", "reading", "work"],
          description: "Purpose: study, exercise, reading, work",
        },
        location: {
          type: "string",
          description: "Location to search near",
        },
        keyword: { type: "string", description: "Additional keyword (optional)" },
        radius: { type: "number", description: "Search radius in meters (default: 500)" },
        limit: { type: "number", description: "Number of results (default: 5)" },
        response_format: { type: "string", enum: ["markdown", "json"], description: "Response format" },
      },
      required: ["purpose", "location"],
    },
  },
  {
    name: "godsaeng_block_session",
    description: `Create a focus session in Kakao Talk Calendar.

**Requires OAuth authentication**

Args:
  - title: string - Event title
  - start_time: string - ISO 8601 format
  - duration_minutes: number - Duration (15-480)
  - location_name, reminder_minutes, color (optional)

Example: "저녁 7시 2시간 공부" -> title="공부", start_time="...", duration_minutes=120`,
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Event title" },
        start_time: { type: "string", description: "Start time (ISO 8601)" },
        duration_minutes: { type: "number", description: "Duration in minutes" },
        location_name: { type: "string", description: "Location name (optional)" },
        location_address: { type: "string", description: "Location address (optional)" },
        reminder_minutes: { type: "number", description: "Reminder (default: 15)" },
        color: { type: "string", enum: ["BLUE", "RED", "YELLOW", "GREEN", "PINK", "ORANGE", "PURPLE", "GRAY"] },
      },
      required: ["title", "start_time", "duration_minutes"],
    },
  },
  {
    name: "godsaeng_send_commitment",
    description: `Send a commitment card to Kakao Talk "나에게 보내기".

**Requires OAuth authentication**

Args:
  - goal: string - Today's goal
  - location_name, location_url, encouragement (optional)

Example: "자격증 공부 2시간" -> goal="자격증 공부 2시간"`,
    inputSchema: {
      type: "object",
      properties: {
        goal: { type: "string", description: "Today's goal" },
        location_name: { type: "string", description: "Location name (optional)" },
        location_url: { type: "string", description: "Kakao Map URL (optional)" },
        encouragement: { type: "string", description: "Custom encouragement (optional)" },
        template_type: { type: "string", enum: ["feed", "text"], description: "Template type (default: feed)" },
      },
      required: ["goal"],
    },
  },
];

// ===== Utility Functions =====

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function truncateResponse(content: string): string {
  if (content.length <= CHARACTER_LIMIT) return content;
  return `${content.slice(0, CHARACTER_LIMIT - 100)}\n\n... (응답이 잘렸습니다)`;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = DEFAULT_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ===== Kakao API Functions =====

async function getCoordinates(location: string): Promise<{ x: string; y: string } | null> {
  if (!KAKAO_REST_API_KEY) return null;

  try {
    // Try address search first
    const addressUrl = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(location)}`;
    const addressRes = await fetchWithTimeout(addressUrl, {
      headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` },
    });
    const addressData = (await addressRes.json()) as KakaoAddressResponse;

    if (addressData.documents.length > 0) {
      return { x: addressData.documents[0].x, y: addressData.documents[0].y };
    }

    // Fallback to keyword search
    const keywordUrl = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(location)}&size=1`;
    const keywordRes = await fetchWithTimeout(keywordUrl, {
      headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` },
    });
    const keywordData = (await keywordRes.json()) as KakaoLocalResponse;

    if (keywordData.documents.length > 0) {
      return { x: keywordData.documents[0].x, y: keywordData.documents[0].y };
    }

    return null;
  } catch {
    return null;
  }
}

async function searchPlaces(
  purpose: Purpose,
  location: string,
  keyword?: string,
  radius = 500,
  limit = 5
): Promise<KakaoPlace[]> {
  if (!KAKAO_REST_API_KEY) {
    throw new Error("KAKAO_REST_API_KEY가 설정되지 않았습니다.");
  }

  const coords = await getCoordinates(location);
  if (!coords) {
    throw new Error(`위치를 찾을 수 없습니다: ${location}`);
  }

  const config = PURPOSE_CONFIG[purpose];
  const searchKeyword = keyword || config.defaultKeyword;
  const fullQuery = `${location} ${searchKeyword}`;

  let url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(fullQuery)}&x=${coords.x}&y=${coords.y}&radius=${radius}&size=${limit}&sort=distance`;

  if (config.categoryCode) {
    url += `&category_group_code=${config.categoryCode}`;
  }

  const response = await fetchWithTimeout(url, {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` },
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error("Kakao API 인증 실패");
    throw new Error(`장소 검색 실패: ${response.status}`);
  }

  const data = (await response.json()) as KakaoLocalResponse;
  return data.documents;
}

// ===== Tool Execution Functions =====

async function executeSearchSpot(args: {
  purpose: Purpose;
  location: string;
  keyword?: string;
  radius?: number;
  limit?: number;
  response_format?: string;
}): Promise<string> {
  const format = args.response_format || "markdown";

  try {
    const places = await searchPlaces(
      args.purpose,
      args.location,
      args.keyword,
      args.radius || 500,
      args.limit || 5
    );

    if (format === "json") {
      return JSON.stringify({
        purpose: args.purpose,
        location: args.location,
        count: places.length,
        places: places.map((p) => ({
          name: p.place_name,
          address: p.road_address_name || p.address_name,
          distance: p.distance,
          phone: p.phone,
          url: p.place_url,
          category: p.category_name,
        })),
      }, null, 2);
    }

    // Markdown format
    const purposeLabel = PURPOSE_LABELS[args.purpose];
    let md = `# ${purposeLabel} 장소 검색 결과\n\n`;
    md += `**위치**: ${args.location}\n`;
    md += `**검색 결과**: ${places.length}개\n\n`;

    if (places.length === 0) {
      md += "검색 결과가 없습니다. 다른 키워드나 위치로 다시 검색해보세요.\n";
      return md;
    }

    places.forEach((place, idx) => {
      md += `## ${idx + 1}. ${place.place_name}\n\n`;
      md += `- **카테고리**: ${place.category_name}\n`;
      md += `- **주소**: ${place.road_address_name || place.address_name}\n`;
      md += `- **거리**: ${place.distance}m\n`;
      if (place.phone) md += `- **전화**: ${place.phone}\n`;
      md += `- **지도**: [카카오맵에서 보기](${place.place_url})\n\n`;
    });

    return truncateResponse(md);
  } catch (error) {
    return `❌ 장소 검색 실패: ${getErrorMessage(error)}`;
  }
}

async function executeBlockSession(args: {
  title: string;
  start_time: string;
  duration_minutes: number;
  location_name?: string;
  location_address?: string;
  reminder_minutes?: number;
  color?: string;
}): Promise<string> {
  const accessToken = process.env.KAKAO_ACCESS_TOKEN;

  if (!accessToken) {
    return "❌ 카카오 로그인이 필요합니다. PlayMCP에서 카카오 계정으로 로그인해주세요.";
  }

  try {
    const startDate = new Date(args.start_time);
    const endDate = new Date(startDate.getTime() + args.duration_minutes * 60 * 1000);
    const reminderMinutes = Math.round((args.reminder_minutes || 15) / 5) * 5;

    const event = {
      title: args.title,
      time: {
        start_at: startDate.toISOString().replace(/\.\d{3}Z$/, "Z"),
        end_at: endDate.toISOString().replace(/\.\d{3}Z$/, "Z"),
        time_zone: "Asia/Seoul",
        all_day: false,
      },
      color: args.color || "BLUE",
      description: `갓생 메이트로 등록한 일정입니다.\n\n목표: ${args.title}`,
      ...(args.location_name && {
        location: {
          name: args.location_name,
          ...(args.location_address && { address: args.location_address }),
        },
      }),
      ...(reminderMinutes > 0 && { reminders: [reminderMinutes] }),
    };

    const response = await fetchWithTimeout(
      "https://kapi.kakao.com/v2/api/calendar/create/event",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        },
        body: new URLSearchParams({ event: JSON.stringify(event) }),
      }
    );

    if (!response.ok) {
      if (response.status === 401) throw new Error("카카오 인증이 만료되었습니다.");
      if (response.status === 403) throw new Error("톡캘린더 권한이 필요합니다.");
      throw new Error(`일정 생성 실패: ${response.status}`);
    }

    const formatTime = (d: Date) => {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    };

    let md = "# 일정 등록 완료\n\n";
    md += `**제목**: ${args.title}\n`;
    md += `**시작**: ${formatTime(startDate)}\n`;
    md += `**종료**: ${formatTime(endDate)}\n`;
    if (args.location_name) md += `**장소**: ${args.location_name}\n`;
    md += `**알림**: ${reminderMinutes}분 전\n\n`;
    md += "톡캘린더에 일정이 등록되었습니다!\n";

    return md;
  } catch (error) {
    return `❌ 일정 등록 실패: ${getErrorMessage(error)}`;
  }
}

async function executeSendCommitment(args: {
  goal: string;
  location_name?: string;
  location_url?: string;
  encouragement?: string;
  template_type?: string;
}): Promise<string> {
  const accessToken = process.env.KAKAO_ACCESS_TOKEN;

  if (!accessToken) {
    return "❌ 카카오 로그인이 필요합니다. PlayMCP에서 카카오 계정으로 로그인해주세요.";
  }

  try {
    const encouragement = args.encouragement || ENCOURAGEMENT_MESSAGES[Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)];
    const templateType = args.template_type || "feed";

    let template: Record<string, unknown>;

    if (templateType === "feed") {
      const description = args.location_name
        ? `${args.goal}\n\n장소: ${args.location_name}\n\n${encouragement}`
        : `${args.goal}\n\n${encouragement}`;

      template = {
        object_type: "feed",
        content: {
          title: "오늘의 갓생 목표",
          description,
          link: {
            web_url: args.location_url || "https://playmcp.kakao.com",
            mobile_web_url: args.location_url || "https://playmcp.kakao.com",
          },
        },
        ...(args.location_url && {
          buttons: [{
            title: "지도 보기",
            link: { web_url: args.location_url, mobile_web_url: args.location_url },
          }],
        }),
      };
    } else {
      template = {
        object_type: "text",
        text: `[오늘의 갓생 목표]\n\n${args.goal}\n\n${encouragement}`.substring(0, 200),
        link: {
          web_url: args.location_url || "https://playmcp.kakao.com",
          mobile_web_url: args.location_url || "https://playmcp.kakao.com",
        },
      };
    }

    const response = await fetchWithTimeout(
      "https://kapi.kakao.com/v2/api/talk/memo/default/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        },
        body: new URLSearchParams({ template_object: JSON.stringify(template) }),
      }
    );

    if (!response.ok) {
      if (response.status === 401) throw new Error("카카오 인증이 만료되었습니다.");
      if (response.status === 403) throw new Error("메시지 전송 권한이 필요합니다.");
      throw new Error(`메시지 전송 실패: ${response.status}`);
    }

    let md = "# 다짐 카드 전송 완료\n\n";
    md += `**오늘의 목표**: ${args.goal}\n`;
    if (args.location_name) md += `**장소**: ${args.location_name}\n`;
    md += `**응원 메시지**: ${encouragement}\n\n`;
    md += "*카카오톡 '나와의 채팅'을 확인해보세요!*\n";

    return md;
  } catch (error) {
    return `❌ 메시지 전송 실패: ${getErrorMessage(error)}`;
  }
}

async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "godsaeng_search_spot":
      return executeSearchSpot(args as Parameters<typeof executeSearchSpot>[0]);
    case "godsaeng_block_session":
      return executeBlockSession(args as Parameters<typeof executeBlockSession>[0]);
    case "godsaeng_send_commitment":
      return executeSendCommitment(args as Parameters<typeof executeSendCommitment>[0]);
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

// ===== Vercel Handler =====

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id, x-session-id, Accept, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const urlPath = req.url?.split("?")[0] || "/";

  // Health check
  if (req.method === "GET" && (urlPath === "/health" || urlPath === "/api/health")) {
    return res.status(200).json({
      status: "ok",
      server: SERVER_INFO.name,
      version: SERVER_INFO.version,
      timestamp: new Date().toISOString(),
      tools: TOOLS.map((t) => t.name),
    });
  }

  // MCP JSON-RPC endpoint
  if (req.method === "POST") {
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
            capabilities: { tools: { listChanged: false } },
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
          result = { content: [{ type: "text", text: toolResult }] };
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
