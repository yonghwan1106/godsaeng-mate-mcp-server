/**
 * Kakao Talk Message API Client
 * Handles sending messages to "Me" (나에게 보내기)
 */
import axios, { AxiosError } from "axios";
import { KAKAO_API, API_CONFIG, ENCOURAGEMENT_MESSAGES } from "../constants.js";
import type { FeedTemplate, TextTemplate, MessageTemplate } from "../types.js";

/**
 * Get a random encouragement message
 */
export function getRandomEncouragement(): string {
  const index = Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length);
  return ENCOURAGEMENT_MESSAGES[index];
}

/**
 * Create a Feed template for commitment card
 */
function createFeedTemplate(
  goal: string,
  encouragement: string,
  locationName?: string,
  locationUrl?: string
): FeedTemplate {
  const description = locationName
    ? `${goal}\n\n장소: ${locationName}\n\n${encouragement}`
    : `${goal}\n\n${encouragement}`;

  const template: FeedTemplate = {
    object_type: "feed",
    content: {
      title: "오늘의 갓생 목표",
      description: description,
      link: {
        web_url: locationUrl || "https://playmcp.kakao.com",
        mobile_web_url: locationUrl || "https://playmcp.kakao.com",
      },
    },
  };

  // Add map button if location URL is provided
  if (locationUrl) {
    template.buttons = [
      {
        title: "지도 보기",
        link: {
          web_url: locationUrl,
          mobile_web_url: locationUrl,
        },
      },
    ];
  }

  return template;
}

/**
 * Create a Text template for simple commitment message
 */
function createTextTemplate(
  goal: string,
  encouragement: string,
  locationUrl?: string
): TextTemplate {
  const text = `[오늘의 갓생 목표]\n\n${goal}\n\n${encouragement}`;

  return {
    object_type: "text",
    text: text.substring(0, 200), // Max 200 characters for text template
    link: {
      web_url: locationUrl || "https://playmcp.kakao.com",
      mobile_web_url: locationUrl || "https://playmcp.kakao.com",
    },
  };
}

/**
 * Send a commitment card to "나에게 보내기"
 */
export async function sendCommitmentCard(
  accessToken: string,
  goal: string,
  options?: {
    locationName?: string;
    locationUrl?: string;
    encouragement?: string;
    templateType?: "feed" | "text";
  }
): Promise<{ success: boolean; message: string }> {
  if (!accessToken) {
    throw new Error(
      "Access Token이 필요합니다. PlayMCP를 통해 카카오 로그인을 해주세요."
    );
  }

  const encouragement = options?.encouragement || getRandomEncouragement();
  const templateType = options?.templateType || "feed";

  let template: MessageTemplate;
  if (templateType === "feed") {
    template = createFeedTemplate(
      goal,
      encouragement,
      options?.locationName,
      options?.locationUrl
    );
  } else {
    template = createTextTemplate(goal, encouragement, options?.locationUrl);
  }

  try {
    await axios.post(
      KAKAO_API.MESSAGE.SEND_TO_ME,
      new URLSearchParams({
        template_object: JSON.stringify(template),
      }),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        },
        timeout: API_CONFIG.TIMEOUT,
      }
    );

    return {
      success: true,
      message: "다짐 카드가 카카오톡 '나와의 채팅'으로 전송되었습니다!",
    };
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 401) {
        throw new Error(
          "카카오 인증이 만료되었습니다. 다시 로그인해주세요."
        );
      }
      if (error.response?.status === 403) {
        throw new Error(
          "메시지 전송 권한이 없습니다. PlayMCP에서 talk_message 권한을 허용해주세요."
        );
      }
      throw new Error(`메시지 전송 실패: ${error.message}`);
    }
    throw error;
  }
}
