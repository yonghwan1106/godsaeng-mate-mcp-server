/**
 * Kakao Talk Calendar API Client
 * Handles calendar event creation
 */
import axios, { AxiosError } from "axios";
import { KAKAO_API, API_CONFIG, DEFAULT_REMINDER_MINUTES } from "../constants.js";
import type { CalendarEvent, CalendarCreateResponse, CalendarColor } from "../types.js";

/**
 * Round reminder minutes to nearest 5 (Kakao Calendar requirement)
 */
function roundToFiveMinutes(minutes: number): number {
  return Math.round(minutes / 5) * 5;
}

/**
 * Calculate end time from start time and duration
 */
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const start = new Date(startTime);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return end.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Format start time to ISO 8601 with Z suffix
 */
function formatStartTime(startTime: string): string {
  // If already has timezone info, convert to UTC
  const date = new Date(startTime);
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Create a calendar event in Kakao Talk Calendar
 */
export async function createCalendarEvent(
  accessToken: string,
  title: string,
  startTime: string,
  durationMinutes: number,
  options?: {
    locationName?: string;
    locationAddress?: string;
    reminderMinutes?: number;
    color?: CalendarColor;
    description?: string;
  }
): Promise<CalendarCreateResponse> {
  if (!accessToken) {
    throw new Error(
      "Access Token이 필요합니다. PlayMCP를 통해 카카오 로그인을 해주세요."
    );
  }

  const formattedStartTime = formatStartTime(startTime);
  const endTime = calculateEndTime(formattedStartTime, durationMinutes);
  const reminderMinutes = roundToFiveMinutes(
    options?.reminderMinutes ?? DEFAULT_REMINDER_MINUTES
  );

  const event: CalendarEvent = {
    title,
    time: {
      start_at: formattedStartTime,
      end_at: endTime,
      time_zone: "Asia/Seoul",
      all_day: false,
    },
    color: options?.color || "BLUE",
  };

  // Add location if provided
  if (options?.locationName) {
    event.location = {
      name: options.locationName,
      ...(options.locationAddress && { address: options.locationAddress }),
    };
  }

  // Add description
  if (options?.description) {
    event.description = options.description;
  }

  // Add reminder (max 2 reminders allowed)
  if (reminderMinutes > 0) {
    event.reminders = [reminderMinutes];
  }

  try {
    const response = await axios.post<CalendarCreateResponse>(
      KAKAO_API.CALENDAR.CREATE_EVENT,
      {
        event: JSON.stringify(event),
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        },
        timeout: API_CONFIG.TIMEOUT,
      }
    );

    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 401) {
        throw new Error(
          "카카오 인증이 만료되었습니다. 다시 로그인해주세요."
        );
      }
      if (error.response?.status === 403) {
        throw new Error(
          "톡캘린더 권한이 없습니다. PlayMCP에서 talk_calendar 권한을 허용해주세요."
        );
      }
      if (error.response?.status === 400) {
        const errorData = error.response.data as { msg?: string };
        throw new Error(
          `일정 생성 실패: ${errorData?.msg || "잘못된 요청입니다."}`
        );
      }
      throw new Error(`일정 생성 실패: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Format datetime for display
 */
export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
