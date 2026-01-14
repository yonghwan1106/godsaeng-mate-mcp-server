# 갓생 메이트 MCP Server (Godsaeng Mate)

> 자기 계발과 생산적인 하루를 지원하는 올인원 라이프스타일 매니지먼트 에이전트

[![MCP](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io)
[![PlayMCP](https://img.shields.io/badge/PlayMCP-Ready-orange)](https://playmcp.kakao.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)

## 개요

**갓생 메이트**는 MZ세대의 '갓생' 트렌드를 지원하는 MCP 서버입니다. 카카오 API를 활용하여 생산성 장소 검색, 톡캘린더 일정 등록, 다짐 카드 전송 기능을 제공합니다.

### 핵심 기능

| 도구 | 설명 | API |
|------|------|-----|
| `godsaeng_search_spot` | 목적별 생산성 장소 검색 | Kakao Local API |
| `godsaeng_block_session` | 톡캘린더에 몰입 시간 등록 | Kakao Calendar API |
| `godsaeng_send_commitment` | 다짐 카드 나에게 보내기 | Kakao Message API |

## 설치 및 실행

### 필수 요구사항

- Node.js 18+
- Kakao REST API Key ([Kakao Developers](https://developers.kakao.com/)에서 발급)

### 설치

```bash
npm install
```

### 환경변수 설정

`.env.example`을 `.env`로 복사하고 API Key를 설정합니다:

```env
KAKAO_REST_API_KEY=your_kakao_rest_api_key
PORT=3000
```

### 빌드

```bash
npm run build
```

### 실행

**stdio 모드 (Claude Desktop)**:
```bash
npm start
```

**HTTP 모드 (Vercel/PlayMCP)**:
```bash
TRANSPORT=http npm start
```

## 도구 사용법

### 1. godsaeng_search_spot (장소 검색)

```json
{
  "purpose": "study",
  "location": "홍대입구역",
  "keyword": "조용한",
  "radius": 500,
  "limit": 5
}
```

**Purpose 옵션**:
- `study`: 스터디카페, 카공 카페
- `exercise`: 헬스장, 필라테스, 요가
- `reading`: 북카페, 도서관
- `work`: 코워킹스페이스

### 2. godsaeng_block_session (일정 등록)

```json
{
  "title": "자격증 공부",
  "start_time": "2026-01-15T19:00:00",
  "duration_minutes": 120,
  "location_name": "스터디카페 콤마",
  "reminder_minutes": 15,
  "color": "BLUE"
}
```

### 3. godsaeng_send_commitment (다짐 카드)

```json
{
  "goal": "자격증 공부 2시간",
  "location_name": "스터디카페 콤마",
  "location_url": "https://place.map.kakao.com/123456",
  "template_type": "feed"
}
```

## PlayMCP 배포

### Vercel 배포

```bash
vercel --prod
```

### PlayMCP 등록

1. [PlayMCP](https://playmcp.kakao.com/) 접속
2. MCP 서버 등록
3. 서버 URL: `https://your-app.vercel.app/mcp`
4. 필요 권한 스코프:
   - `talk_calendar` (일정 등록)
   - `talk_message` (메시지 전송)

## 프로젝트 구조

```
godsaeng-mate-mcp-server/
├── src/
│   ├── index.ts          # MCP 서버 메인
│   ├── config.ts         # 환경변수 검증
│   ├── constants.ts      # 상수 정의
│   ├── types.ts          # TypeScript 타입
│   ├── tools/            # MCP 도구 구현
│   ├── services/         # API 클라이언트
│   └── schemas/          # Zod 스키마
├── api/
│   └── index.ts          # Vercel 핸들러
├── package.json
├── tsconfig.json
└── vercel.json
```

## 카카오 MCP Player 10 공모전

이 프로젝트는 카카오 PlayMCP 공모전 'MCP Player 10' 참가작입니다.

- **공모전 기간**: 2025.12.19 ~ 2026.01.18
- **결과 발표**: 2026.02.03

## 라이선스

MIT License

---

**Generated with Claude Code**
