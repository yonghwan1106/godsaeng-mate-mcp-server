/**
 * Configuration module for Godsaeng Mate MCP Server
 * Validates and exports environment variables
 */

export interface Config {
  kakaoRestApiKey: string;
  port: number;
  nodeEnv: string;
}

function validateEnv(): Config {
  const kakaoRestApiKey = process.env.KAKAO_REST_API_KEY;

  if (!kakaoRestApiKey) {
    console.error("WARNING: KAKAO_REST_API_KEY not set. Place search will not work.");
  }

  return {
    kakaoRestApiKey: kakaoRestApiKey || "",
    port: parseInt(process.env.PORT || "3000", 10),
    nodeEnv: process.env.NODE_ENV || "development",
  };
}

export const config = validateEnv();
