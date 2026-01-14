/**
 * Response formatters for MCP tool outputs
 */
import type {
  ResponseFormat,
  ProcessedPlace,
  Purpose,
  SearchSpotOutput,
  BlockSessionOutput,
  SendCommitmentOutput,
} from "../types.js";

const PURPOSE_LABELS: Record<Purpose, string> = {
  study: "공부",
  exercise: "운동",
  reading: "독서",
  work: "업무",
};

/**
 * Format search spot results
 */
export function formatSearchSpotResult(
  output: SearchSpotOutput,
  format: ResponseFormat
): string {
  if (format === "json") {
    return JSON.stringify(output, null, 2);
  }

  // Markdown format
  const purposeLabel = PURPOSE_LABELS[output.purpose];
  const lines: string[] = [
    `# ${purposeLabel} 장소 검색 결과`,
    "",
    `**검색어**: ${output.query}`,
    `**위치**: ${output.location}`,
    `**검색 결과**: ${output.total}개`,
    "",
  ];

  if (output.places.length === 0) {
    lines.push("검색 결과가 없습니다. 다른 키워드나 위치로 다시 검색해보세요.");
    return lines.join("\n");
  }

  output.places.forEach((place, index) => {
    lines.push(`## ${index + 1}. ${place.name}`);
    lines.push("");
    lines.push(`- **카테고리**: ${place.category}`);
    lines.push(`- **주소**: ${place.roadAddress}`);
    lines.push(`- **거리**: ${place.distance}`);
    lines.push(`- **전화**: ${place.phone}`);
    lines.push(`- **지도**: [카카오맵에서 보기](${place.mapUrl})`);
    lines.push("");
  });

  lines.push("---");
  lines.push("*장소를 선택하면 일정을 등록할 수 있습니다.*");

  return lines.join("\n");
}

/**
 * Format block session result
 */
export function formatBlockSessionResult(
  output: BlockSessionOutput,
  format: ResponseFormat
): string {
  if (format === "json") {
    return JSON.stringify(output, null, 2);
  }

  // Markdown format
  const lines: string[] = [];

  if (output.success) {
    lines.push("# 일정 등록 완료");
    lines.push("");
    lines.push(`**제목**: ${output.title}`);
    lines.push(`**시작**: ${output.startTime}`);
    lines.push(`**종료**: ${output.endTime}`);
    if (output.location) {
      lines.push(`**장소**: ${output.location}`);
    }
    lines.push(`**알림**: ${output.reminder}분 전`);
    lines.push("");
    lines.push("톡캘린더에 일정이 등록되었습니다!");
  } else {
    lines.push("# 일정 등록 실패");
    lines.push("");
    lines.push(output.message);
  }

  return lines.join("\n");
}

/**
 * Format send commitment result
 */
export function formatSendCommitmentResult(
  output: SendCommitmentOutput,
  format: ResponseFormat
): string {
  if (format === "json") {
    return JSON.stringify(output, null, 2);
  }

  // Markdown format
  const lines: string[] = [];

  if (output.success) {
    lines.push("# 다짐 카드 전송 완료");
    lines.push("");
    lines.push(`**오늘의 목표**: ${output.goal}`);
    if (output.location) {
      lines.push(`**장소**: ${output.location}`);
    }
    lines.push(`**응원 메시지**: ${output.encouragement}`);
    lines.push("");
    lines.push(output.message);
    lines.push("");
    lines.push("*카카오톡 '나와의 채팅'을 확인해보세요!*");
  } else {
    lines.push("# 다짐 카드 전송 실패");
    lines.push("");
    lines.push(output.message);
  }

  return lines.join("\n");
}
