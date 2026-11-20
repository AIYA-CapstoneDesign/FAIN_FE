// TanStack Query 키와 캐시 수명 설정
//
// GPT 리포트 API(GET /reports/{id}, GET /month/reports)는 서버가 요청을 받을 때마다
// GPT를 새로 호출해 리포트를 다시 만든다. 기본값(staleTime 0)이면 같은 화면에
// 다시 들어올 때마다 GPT가 재호출되어 응답이 느리고, 리포트 내용도 매번 바뀐다.
// → 한 번 받은 리포트는 세션 동안 재사용하고, 데이터가 바뀌는 시점(조치 저장,
//   새 낙상 알림)에만 명시적으로 무효화한다.

const MINUTE = 60 * 1000;

export const STALE_TIME = {
  // 낙상 1건의 GPT 리포트: 같은 낙상에 대해서는 다시 만들 필요가 없음
  emergencyReport: Infinity,
  // 월간 통계·GPT 월간 리포트: 새 낙상이 생기면 무효화하므로 길게 유지
  monthly: 10 * MINUTE,
  // 히스토리 목록·상세: 조치 저장·새 낙상 시 무효화
  history: 5 * MINUTE,
} as const;

export const GC_TIME = 30 * MINUTE;

export const queryKeys = {
  emergencyReport: (reportId: number) => ["emergencyReport", reportId] as const,

  historyAll: ["history"] as const,
  historyList: () => ["history", "list"] as const,
  historyDetail: (reportId: number) => ["history", "detail", reportId] as const,

  monthAll: ["month"] as const,
  monthSummary: (year: number, month: number) =>
    ["month", "summary", year, month] as const,
  monthGraph: (year: number, month: number) =>
    ["month", "graph", year, month] as const,
  monthReport: (year: number, month: number) =>
    ["month", "report", year, month] as const,
};
