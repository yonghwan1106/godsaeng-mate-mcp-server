/**
 * Constants for Godsaeng Mate MCP Server
 */

// Kakao API Endpoints
export const KAKAO_API = {
  LOCAL: {
    KEYWORD_SEARCH: "https://dapi.kakao.com/v2/local/search/keyword.json",
    CATEGORY_SEARCH: "https://dapi.kakao.com/v2/local/search/category.json",
    ADDRESS_SEARCH: "https://dapi.kakao.com/v2/local/search/address.json",
  },
  CALENDAR: {
    CREATE_EVENT: "https://kapi.kakao.com/v2/api/calendar/create/event",
    LIST_EVENTS: "https://kapi.kakao.com/v2/api/calendar/events",
  },
  MESSAGE: {
    SEND_TO_ME: "https://kapi.kakao.com/v2/api/talk/memo/default/send",
  },
} as const;

// Category Group Codes for Kakao Local API
export const CATEGORY_CODES = {
  CAFE: "CE7",
  RESTAURANT: "FD6",
  CONVENIENCE_STORE: "CS2",
  HOSPITAL: "HP8",
  PHARMACY: "PM9",
  BANK: "BK9",
  SUBWAY: "SW8",
  PARKING: "PK6",
  CULTURE: "CT1",
  ACCOMMODATION: "AD5",
  SCHOOL: "SC4",
  ACADEMY: "AC5",
} as const;

// Purpose to search strategy mapping
export const PURPOSE_CONFIG = {
  study: {
    keywords: ["스터디카페", "카공", "독서실"],
    categoryCode: "CE7",
    defaultKeyword: "스터디카페",
  },
  exercise: {
    keywords: ["헬스장", "피트니스", "필라테스", "요가"],
    categoryCode: null, // Use keyword search only
    defaultKeyword: "헬스장",
  },
  reading: {
    keywords: ["북카페", "도서관", "독서"],
    categoryCode: "CE7",
    defaultKeyword: "북카페",
  },
  work: {
    keywords: ["코워킹스페이스", "공유오피스", "카페"],
    categoryCode: null,
    defaultKeyword: "코워킹스페이스",
  },
} as const;

// Calendar colors
export const CALENDAR_COLORS = [
  "BLUE",
  "RED",
  "YELLOW",
  "GREEN",
  "PINK",
  "ORANGE",
  "PURPLE",
  "GRAY",
] as const;

// Encouragement messages for commitment cards
export const ENCOURAGEMENT_MESSAGES = [
  "오늘 하루도 갓생 달성!",
  "작은 실천이 큰 변화를 만듭니다",
  "꾸준함이 실력이 됩니다",
  "오늘의 노력이 내일의 나를 만듭니다",
  "할 수 있다! 파이팅!",
  "시작이 반이다!",
  "포기하지 않는 당신이 멋집니다",
] as const;

// API Configuration
export const API_CONFIG = {
  TIMEOUT: 10000, // 10 seconds
  DEFAULT_RADIUS: 500, // meters
  MAX_RADIUS: 20000, // meters
  DEFAULT_LIMIT: 5,
  MAX_LIMIT: 15,
  CHARACTER_LIMIT: 25000,
} as const;

// Default reminder time (in minutes)
export const DEFAULT_REMINDER_MINUTES = 15;
