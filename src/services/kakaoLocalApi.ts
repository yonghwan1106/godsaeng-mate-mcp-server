/**
 * Kakao Local API Client
 * Handles place search and address lookup
 */
import axios, { AxiosError } from "axios";
import { config } from "../config.js";
import { KAKAO_API, PURPOSE_CONFIG, API_CONFIG } from "../constants.js";
import type {
  Purpose,
  KakaoLocalResponse,
  KakaoAddressResponse,
  KakaoPlace,
  ProcessedPlace,
} from "../types.js";

/**
 * Get coordinates for a location using address search
 */
export async function getCoordinates(
  location: string
): Promise<{ x: string; y: string } | null> {
  try {
    const response = await axios.get<KakaoAddressResponse>(
      KAKAO_API.LOCAL.ADDRESS_SEARCH,
      {
        headers: {
          Authorization: `KakaoAK ${config.kakaoRestApiKey}`,
        },
        params: {
          query: location,
        },
        timeout: API_CONFIG.TIMEOUT,
      }
    );

    if (response.data.documents.length > 0) {
      const doc = response.data.documents[0];
      return { x: doc.x, y: doc.y };
    }

    // Fallback: try keyword search for the location
    const keywordResponse = await axios.get<KakaoLocalResponse>(
      KAKAO_API.LOCAL.KEYWORD_SEARCH,
      {
        headers: {
          Authorization: `KakaoAK ${config.kakaoRestApiKey}`,
        },
        params: {
          query: location,
          size: 1,
        },
        timeout: API_CONFIG.TIMEOUT,
      }
    );

    if (keywordResponse.data.documents.length > 0) {
      const place = keywordResponse.data.documents[0];
      return { x: place.x, y: place.y };
    }

    return null;
  } catch (error) {
    console.error("Error getting coordinates:", error);
    return null;
  }
}

/**
 * Search for places based on purpose and location
 */
export async function searchPlaces(
  purpose: Purpose,
  location: string,
  keyword?: string,
  radius: number = API_CONFIG.DEFAULT_RADIUS,
  limit: number = API_CONFIG.DEFAULT_LIMIT
): Promise<{ places: KakaoPlace[]; query: string }> {
  if (!config.kakaoRestApiKey) {
    throw new Error("KAKAO_REST_API_KEY is not configured");
  }

  // Get coordinates for the location
  const coords = await getCoordinates(location);
  if (!coords) {
    throw new Error(`위치를 찾을 수 없습니다: ${location}`);
  }

  const purposeConfig = PURPOSE_CONFIG[purpose];
  const searchKeyword = keyword || purposeConfig.defaultKeyword;
  const fullQuery = `${location} ${searchKeyword}`;

  try {
    const response = await axios.get<KakaoLocalResponse>(
      KAKAO_API.LOCAL.KEYWORD_SEARCH,
      {
        headers: {
          Authorization: `KakaoAK ${config.kakaoRestApiKey}`,
        },
        params: {
          query: fullQuery,
          x: coords.x,
          y: coords.y,
          radius: radius,
          size: limit,
          sort: "distance",
          ...(purposeConfig.categoryCode && {
            category_group_code: purposeConfig.categoryCode,
          }),
        },
        timeout: API_CONFIG.TIMEOUT,
      }
    );

    return {
      places: response.data.documents,
      query: fullQuery,
    };
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 401) {
        throw new Error("Kakao API 인증 실패. API Key를 확인해주세요.");
      }
      if (error.response?.status === 429) {
        throw new Error("API 호출 한도 초과. 잠시 후 다시 시도해주세요.");
      }
      throw new Error(`장소 검색 실패: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Process raw place data into a cleaner format
 */
export function processPlace(place: KakaoPlace): ProcessedPlace {
  return {
    name: place.place_name,
    address: place.address_name,
    roadAddress: place.road_address_name || place.address_name,
    phone: place.phone || "정보 없음",
    category: place.category_name,
    distance: place.distance ? `${place.distance}m` : "정보 없음",
    mapUrl: place.place_url,
    coordinates: {
      latitude: place.y,
      longitude: place.x,
    },
  };
}

/**
 * Search and process places
 */
export async function searchProductivitySpots(
  purpose: Purpose,
  location: string,
  keyword?: string,
  radius?: number,
  limit?: number
): Promise<{ places: ProcessedPlace[]; query: string; total: number }> {
  const result = await searchPlaces(purpose, location, keyword, radius, limit);

  return {
    places: result.places.map(processPlace),
    query: result.query,
    total: result.places.length,
  };
}
