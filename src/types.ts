/**
 * TypeScript type definitions for Godsaeng Mate MCP Server
 */

// Purpose types for productivity spots
export type Purpose = "study" | "exercise" | "reading" | "work";

// Response format options
export type ResponseFormat = "markdown" | "json";

// Calendar colors
export type CalendarColor =
  | "BLUE"
  | "RED"
  | "YELLOW"
  | "GREEN"
  | "PINK"
  | "ORANGE"
  | "PURPLE"
  | "GRAY";

// Message template types
export type MessageTemplateType = "feed" | "text";

// Kakao Local API Response Types
export interface KakaoLocalMeta {
  total_count: number;
  pageable_count: number;
  is_end: boolean;
  same_name?: {
    region: string[];
    keyword: string;
    selected_region: string;
  };
}

export interface KakaoPlace {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code: string;
  category_group_name: string;
  phone: string;
  address_name: string;
  road_address_name: string;
  x: string; // longitude
  y: string; // latitude
  place_url: string;
  distance?: string;
}

export interface KakaoLocalResponse {
  meta: KakaoLocalMeta;
  documents: KakaoPlace[];
}

export interface KakaoAddressDocument {
  address_name: string;
  x: string;
  y: string;
  address_type: string;
  address?: {
    address_name: string;
    region_1depth_name: string;
    region_2depth_name: string;
    region_3depth_name: string;
  };
  road_address?: {
    address_name: string;
    road_name: string;
    building_name: string;
  };
}

export interface KakaoAddressResponse {
  meta: KakaoLocalMeta;
  documents: KakaoAddressDocument[];
}

// Kakao Calendar API Types
export interface CalendarEventTime {
  start_at: string; // ISO 8601 format
  end_at: string;
  time_zone?: string;
  all_day?: boolean;
  lunar?: boolean;
}

export interface CalendarEventLocation {
  name?: string;
  location_id?: number;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface CalendarEvent {
  title: string;
  time: CalendarEventTime;
  description?: string;
  location?: CalendarEventLocation;
  reminders?: number[]; // minutes before event
  color?: CalendarColor;
}

export interface CalendarCreateResponse {
  event_id: string;
}

// Kakao Message API Types
export interface MessageLink {
  web_url?: string;
  mobile_web_url?: string;
}

export interface MessageButton {
  title: string;
  link: MessageLink;
}

export interface MessageContent {
  title: string;
  description?: string;
  image_url?: string;
  image_width?: number;
  image_height?: number;
  link?: MessageLink;
}

export interface FeedTemplate {
  object_type: "feed";
  content: MessageContent;
  buttons?: MessageButton[];
}

export interface TextTemplate {
  object_type: "text";
  text: string;
  link: MessageLink;
  buttons?: MessageButton[];
}

export type MessageTemplate = FeedTemplate | TextTemplate;

// Processed Place for output
export interface ProcessedPlace {
  name: string;
  address: string;
  roadAddress: string;
  phone: string;
  category: string;
  distance: string;
  mapUrl: string;
  coordinates: {
    latitude: string;
    longitude: string;
  };
}

// Tool Output Types
export interface SearchSpotOutput {
  query: string;
  purpose: Purpose;
  location: string;
  total: number;
  places: ProcessedPlace[];
}

export interface BlockSessionOutput {
  success: boolean;
  eventId?: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  reminder: number;
  message: string;
}

export interface SendCommitmentOutput {
  success: boolean;
  goal: string;
  location?: string;
  encouragement: string;
  message: string;
}
