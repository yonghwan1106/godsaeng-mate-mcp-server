#!/usr/bin/env node
/**
 * Godsaeng Mate MCP Server
 *
 * An all-in-one lifestyle management agent for God-saeng (productive life).
 * Provides tools to search productivity spots, block focus sessions on calendar,
 * and send commitment cards via Kakao Talk.
 *
 * Supports both stdio (Claude Desktop) and HTTP (Vercel/PlayMCP) transports.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";
import { config } from "./config.js";
import { registerAllTools } from "./tools/index.js";

// Server metadata
const SERVER_NAME = "godsaeng-mate-mcp-server";
const SERVER_VERSION = "1.0.0";

/**
 * Create and configure MCP server
 */
function createServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  // Register all tools
  registerAllTools(server);

  return server;
}

/**
 * Run server in stdio mode (for Claude Desktop)
 */
async function runStdio(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error(`${SERVER_NAME} v${SERVER_VERSION} running via stdio`);
}

/**
 * Run server in HTTP mode (for Vercel/PlayMCP)
 */
async function runHttp(): Promise<void> {
  const app = express();
  app.use(express.json());

  // Health check endpoint
  app.get("/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      server: SERVER_NAME,
      version: SERVER_VERSION,
      timestamp: new Date().toISOString(),
    });
  });

  // Root endpoint - server info
  app.get("/", (_req: Request, res: Response) => {
    res.json({
      name: SERVER_NAME,
      version: SERVER_VERSION,
      description:
        "Godsaeng Mate MCP Server - Your productivity partner for God-saeng life",
      tools: [
        "godsaeng_search_spot",
        "godsaeng_block_session",
        "godsaeng_send_commitment",
      ],
      documentation: "https://github.com/yonghwan1106/godsaeng-mate-mcp-server",
    });
  });

  // MCP endpoint
  app.post("/mcp", async (req: Request, res: Response) => {
    try {
      const server = createServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // Stateless mode
        enableJsonResponse: true,
      });

      res.on("close", () => {
        transport.close();
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("MCP request error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error",
          },
          id: null,
        });
      }
    }
  });

  const port = config.port;
  app.listen(port, () => {
    console.error(`${SERVER_NAME} v${SERVER_VERSION} running on http://localhost:${port}`);
    console.error(`MCP endpoint: http://localhost:${port}/mcp`);
    console.error(`Health check: http://localhost:${port}/health`);
  });
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const transport = process.env.TRANSPORT || "stdio";

  if (transport === "http") {
    await runHttp();
  } else {
    await runStdio();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

export { createServer };
