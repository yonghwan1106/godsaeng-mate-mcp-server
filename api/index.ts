/**
 * Vercel Serverless Handler for Godsaeng Mate MCP Server
 *
 * Handles MCP requests via Streamable HTTP transport for PlayMCP integration.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

// Server metadata
const SERVER_NAME = "godsaeng-mate-mcp-server";
const SERVER_VERSION = "1.0.0";

// Import tool registration dynamically to avoid module resolution issues in Vercel
async function createServer(): Promise<McpServer> {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  // Dynamically import and register tools
  const { registerAllTools } = await import("../src/tools/index.js");
  registerAllTools(server);

  return server;
}

/**
 * Vercel serverless function handler
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.status(200).end();
    return;
  }

  // Set CORS headers for all responses
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Health check endpoint
  if (req.url === "/health" || (req.method === "GET" && req.url === "/")) {
    res.status(200).json({
      status: "ok",
      server: SERVER_NAME,
      version: SERVER_VERSION,
      timestamp: new Date().toISOString(),
      tools: [
        "godsaeng_search_spot",
        "godsaeng_block_session",
        "godsaeng_send_commitment",
      ],
    });
    return;
  }

  // MCP endpoint (POST /mcp or POST /)
  if (req.method === "POST") {
    try {
      const server = await createServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // Stateless mode for serverless
        enableJsonResponse: true,
      });

      // Handle cleanup
      res.on("close", () => {
        transport.close();
      });

      await server.connect(transport);

      // Convert Vercel request to Express-compatible format
      const expressReq = {
        ...req,
        body: req.body,
        headers: req.headers,
        method: req.method,
        url: req.url,
      };

      const expressRes = {
        ...res,
        setHeader: (name: string, value: string | number | readonly string[]) => {
          res.setHeader(name, value);
          return expressRes;
        },
        status: (code: number) => {
          res.status(code);
          return expressRes;
        },
        json: (data: unknown) => {
          res.json(data);
          return expressRes;
        },
        send: (data: unknown) => {
          res.send(data);
          return expressRes;
        },
        end: (data?: unknown) => {
          res.end(data);
          return expressRes;
        },
        headersSent: res.headersSent,
        on: res.on.bind(res),
      };

      await transport.handleRequest(expressReq as any, expressRes as any, req.body);
    } catch (error) {
      console.error("MCP handler error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error",
            data: error instanceof Error ? error.message : "Unknown error",
          },
          id: null,
        });
      }
    }
    return;
  }

  // Method not allowed
  res.status(405).json({
    error: "Method not allowed",
    allowedMethods: ["GET", "POST", "OPTIONS"],
  });
}
