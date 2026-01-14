/**
 * Tool registration module
 * Exports function to register all tools with the MCP server
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSearchSpotTool } from "./searchSpot.js";
import { registerBlockSessionTool } from "./blockSession.js";
import { registerSendCommitmentTool } from "./sendCommitment.js";

/**
 * Register all Godsaeng Mate tools with the MCP server
 */
export function registerAllTools(server: McpServer): void {
  registerSearchSpotTool(server);
  registerBlockSessionTool(server);
  registerSendCommitmentTool(server);
}

export { registerSearchSpotTool, registerBlockSessionTool, registerSendCommitmentTool };
