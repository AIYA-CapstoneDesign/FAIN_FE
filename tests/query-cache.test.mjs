// GPT 리포트 쿼리 캐시 설정 검증·측정
// 실행: node --test tests/*.test.mjs (의존성 설치 필요: @tanstack/query-core, typescript)
//
// 실제 화면 대신 QueryObserver 구독/해제로 "화면 진입/이탈"을 흉내 내고,
// 보호자의 일반적인 이동 흐름에서 GPT를 다시 부르는 API가 몇 번 호출되는지 센다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { QueryClient, QueryObserver } from "@tanstack/query-core";

// src/api/queryConfig.ts를 그대로 트랜스파일해서 사용 (설정값 복붙 방지)
async function loadQueryConfig() {
  const source = readFileSync(
    new URL("../src/api/queryConfig.ts", import.meta.url),
    "utf8"
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const file = join(mkdtempSync(join(tmpdir(), "fain-")), "queryConfig.mjs");
  writeFileSync(file, outputText);
  return import(pathToFileURL(file).href);
}

const { STALE_TIME, GC_TIME, queryKeys } = await loadQueryConfig();

// RQProvider.tsx의 전역 기본값과 동일
const createClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retryOnMount: true,
        refetchOnReconnect: false,
        retry: 0,
      },
    },
  });

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

// 개선 전 쿼리 정의 (eed462e 기준: staleTime·gcTime 미설정)
const beforeQueries = {
  emergencyReport: (id, fn) => ({ queryKey: ["emergencyReport", String(id)], queryFn: fn }),
  monthReport: (y, m, fn) => ({ queryKey: ["report", y, m], queryFn: fn }),
  monthSummary: (y, m, fn) => ({ queryKey: ["summary", y, m], queryFn: fn }),
  monthGraph: (y, m, fn) => ({ queryKey: ["graph", y, m], queryFn: fn }),
  historyList: (fn) => ({ queryKey: ["history"], queryFn: fn }),
};

// 개선 후 쿼리 정의 (페이지 코드와 같은 설정)
const afterQueries = {
  emergencyReport: (id, fn) => ({
    queryKey: queryKeys.emergencyReport(id),
    queryFn: fn,
    staleTime: STALE_TIME.emergencyReport,
    gcTime: GC_TIME,
  }),
  monthReport: (y, m, fn) => ({
    queryKey: queryKeys.monthReport(y, m),
    queryFn: fn,
    staleTime: STALE_TIME.monthly,
    gcTime: GC_TIME,
  }),
  monthSummary: (y, m, fn) => ({
    queryKey: queryKeys.monthSummary(y, m),
    queryFn: fn,
    staleTime: STALE_TIME.monthly,
    gcTime: GC_TIME,
  }),
  monthGraph: (y, m, fn) => ({
    queryKey: queryKeys.monthGraph(y, m),
    queryFn: fn,
    staleTime: STALE_TIME.monthly,
    gcTime: GC_TIME,
  }),
  historyList: (fn) => ({
    queryKey: queryKeys.historyList(),
    queryFn: fn,
    staleTime: STALE_TIME.history,
  }),
};

// 보호자 이동 흐름 시뮬레이션 → API별 호출 횟수 반환
async function runScenario(defs) {
  const client = createClient();
  const calls = { gptReport: 0, gptMonthly: 0, monthStats: 0, history: 0 };
  const fetchers = {
    report: async () => (calls.gptReport++, { report: "..." }),
    monthReport: async () => (calls.gptMonthly++, { aiComment: "..." }),
    monthStat: async () => (calls.monthStats++, {}),
    history: async () => (calls.history++, []),
  };

  let mounted = [];
  const visit = async (...options) => {
    mounted.forEach((unsubscribe) => unsubscribe()); // 이전 화면 이탈
    mounted = options.map((o) =>
      new QueryObserver(client, o).subscribe(() => {})
    );
    await tick();
  };

  const emergency = (id) => defs.emergencyReport(id, fetchers.report);
  const analysis = (y, m) => [
    defs.monthSummary(y, m, fetchers.monthStat),
    defs.monthGraph(y, m, fetchers.monthStat),
    defs.monthReport(y, m, fetchers.monthReport),
  ];
  const history = () => defs.historyList(fetchers.history);

  // 1) 낙상 알림 → 낙상 상세(#42)
  await visit(emergency(42));
  // 2) 히스토리 탭을 봤다가 다시 낙상 상세(#42)로
  await visit(history());
  await visit(emergency(42));
  // 3) 분석 탭: 6월 → 5월 → 다시 6월
  await visit(...analysis(2025, 6));
  await visit(...analysis(2025, 5));
  await visit(...analysis(2025, 6));
  // 4) 히스토리 탭 → 분석 탭 복귀(6월)
  await visit(history());
  await visit(...analysis(2025, 6));

  mounted.forEach((unsubscribe) => unsubscribe());
  client.clear();
  return calls;
}

test("같은 흐름에서 GPT 리포트 재생성 호출이 줄어든다", async () => {
  const before = await runScenario(beforeQueries);
  const after = await runScenario(afterQueries);

  const gptBefore = before.gptReport + before.gptMonthly;
  const gptAfter = after.gptReport + after.gptMonthly;

  console.log("[측정] 개선 전", before, "GPT 호출 합계", gptBefore);
  console.log("[측정] 개선 후", after, "GPT 호출 합계", gptAfter);

  // 낙상 리포트는 #42 1번, 월간 리포트는 6월·5월 각 1번만
  assert.equal(after.gptReport, 1);
  assert.equal(after.gptMonthly, 2);
  assert.ok(gptAfter < gptBefore);
});

test("조치 저장 후 무효화하면 히스토리·월간 통계를 다시 받는다", async () => {
  const client = createClient();
  let historyCalls = 0;
  let statCalls = 0;
  const list = new QueryObserver(
    client,
    afterQueries.historyList(async () => (historyCalls++, []))
  ).subscribe(() => {});
  const stat = new QueryObserver(
    client,
    afterQueries.monthSummary(2025, 6, async () => (statCalls++, {}))
  ).subscribe(() => {});
  await tick();

  // ResponseModal.tsx와 같은 무효화
  await Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.historyAll }),
    client.invalidateQueries({ queryKey: queryKeys.monthAll }),
  ]);
  await tick();

  assert.equal(historyCalls, 2);
  assert.equal(statCalls, 2);
  list();
  stat();
  client.clear();
});

test("무효화 키가 하위 키를 모두 포함한다", () => {
  const startsWith = (key, prefix) =>
    prefix.every((part, i) => key[i] === part);
  assert.ok(startsWith(queryKeys.historyList(), queryKeys.historyAll));
  assert.ok(startsWith(queryKeys.historyDetail(1), queryKeys.historyAll));
  assert.ok(startsWith(queryKeys.monthSummary(2025, 6), queryKeys.monthAll));
  assert.ok(startsWith(queryKeys.monthGraph(2025, 6), queryKeys.monthAll));
  assert.ok(startsWith(queryKeys.monthReport(2025, 6), queryKeys.monthAll));
});
