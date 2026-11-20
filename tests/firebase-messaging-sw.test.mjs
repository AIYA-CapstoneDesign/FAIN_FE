// 서비스 워커(public/firebase-messaging-sw.js) 단위 테스트
// 실행: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const SW_SOURCE = readFileSync(
  new URL("../public/firebase-messaging-sw.js", import.meta.url),
  "utf8"
);
const ORIGIN = "https://fain-fe.vercel.app";

// 서비스 워커 전역 환경을 흉내 내는 샌드박스
function loadServiceWorker({ openClients = [] } = {}) {
  const listeners = {};
  const shown = [];
  const opened = [];
  let backgroundHandler = null;

  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type, fn) => {
      (listeners[type] ??= []).push(fn);
    },
    skipWaiting: () => {},
    clients: {
      matchAll: async () => openClients,
      openWindow: async (url) => {
        opened.push(url);
        return { url };
      },
      claim: async () => {},
    },
    registration: {
      showNotification: (title, options) => shown.push({ title, options }),
    },
  };

  const firebase = {
    initializeApp: () => {},
    messaging: () => ({
      onBackgroundMessage: (fn) => {
        backgroundHandler = fn;
      },
    }),
  };

  const context = vm.createContext({
    self,
    firebase,
    importScripts: () => {},
    caches: { keys: async () => [], delete: async () => true },
    URL,
  });
  vm.runInContext(SW_SOURCE, context);

  return { listeners, shown, opened, backgroundHandler: () => backgroundHandler };
}

// notificationclick 이벤트를 발생시키고 waitUntil 작업이 끝날 때까지 기다림
async function click(sw, data) {
  let pending;
  let closed = false;
  const event = {
    notification: { data, close: () => (closed = true) },
    waitUntil: (p) => (pending = p),
  };
  for (const fn of sw.listeners.notificationclick) fn(event);
  await pending;
  return { closed };
}

test("notificationclick 리스너가 Firebase SDK보다 먼저 등록된다", () => {
  const firstListener = SW_SOURCE.indexOf('addEventListener("notificationclick"');
  const firstImport = SW_SOURCE.indexOf("importScripts(");
  assert.ok(firstListener > -1, "notificationclick 리스너 없음");
  assert.ok(firstListener < firstImport, "importScripts보다 뒤에 등록됨");
});

test("SDK가 띄운 알림(FCM_MSG) 클릭 → 해당 낙상 상세 새 창", async () => {
  const sw = loadServiceWorker();
  const { closed } = await click(sw, {
    FCM_MSG: { data: { reportId: "42" } },
  });
  assert.equal(closed, true);
  assert.deepEqual(sw.opened, [`${ORIGIN}/emergency/42`]);
});

test("직접 띄운 알림(data.reportId) 클릭 → 해당 낙상 상세", async () => {
  const sw = loadServiceWorker();
  await click(sw, { reportId: "7" });
  assert.deepEqual(sw.opened, [`${ORIGIN}/emergency/7`]);
});

test("앱 창이 이미 열려 있으면 새 창 대신 그 창을 포커스하고 이동", async () => {
  const calls = [];
  const appWindow = {
    url: `${ORIGIN}/analysis`,
    focus: async () => calls.push("focus"),
    navigate: async (url) => calls.push(`navigate:${url}`),
  };
  const sw = loadServiceWorker({ openClients: [appWindow] });
  await click(sw, { FCM_MSG: { data: { reportId: "42" } } });
  assert.deepEqual(calls, ["focus", `navigate:${ORIGIN}/emergency/42`]);
  assert.deepEqual(sw.opened, []);
});

test("reportId가 없으면 스트리밍(홈)으로 이동", async () => {
  const sw = loadServiceWorker();
  await click(sw, {});
  assert.deepEqual(sw.opened, [`${ORIGIN}/streaming`]);
});

test("notification 필드가 있는 메시지는 직접 띄우지 않음 (SDK와 중복 방지)", () => {
  const sw = loadServiceWorker();
  sw.backgroundHandler()({
    notification: { body: "낙상이 감지되었습니다." },
    data: { reportId: "42" },
  });
  assert.equal(sw.shown.length, 0);
});

test("data 전용 메시지는 제목·본문 기본값과 올바른 아이콘으로 표시", () => {
  const sw = loadServiceWorker();
  sw.backgroundHandler()({ data: { reportId: "42" } });
  assert.equal(sw.shown.length, 1);
  assert.equal(sw.shown[0].title, "FAIN");
  assert.equal(sw.shown[0].options.body, "낙상이 감지되었습니다.");
  assert.equal(sw.shown[0].options.icon, "/icon-192x192.png");
  assert.equal(sw.shown[0].options.data.reportId, "42");
});
