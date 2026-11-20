// 알림 클릭 처리
// Firebase SDK도 자체 notificationclick 리스너를 등록하므로,
// SDK보다 먼저 실행되도록 importScripts 이전에 등록한다.
const DEFAULT_PATH = "/streaming";

// 알림에서 reportId 추출
// - 직접 띄운 알림: notification.data.reportId
// - FCM SDK가 자동으로 띄운 알림: notification.data.FCM_MSG.data.reportId
const getReportId = (notificationData) => {
  if (!notificationData) return null;
  return (
    notificationData.reportId ??
    notificationData.FCM_MSG?.data?.reportId ??
    null
  );
};

const getTargetPath = (notificationData) => {
  const reportId = getReportId(notificationData);
  return reportId ? `/emergency/${reportId}` : DEFAULT_PATH;
};

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    getTargetPath(event.notification.data),
    self.location.origin
  ).href;

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // 이미 열려 있는 앱 창이 있으면 그 창을 낙상 상세로 이동
      const appClient = windowClients.find((client) =>
        client.url.startsWith(self.location.origin)
      );

      if (appClient) {
        await appClient.focus();
        if ("navigate" in appClient) {
          return appClient.navigate(targetUrl);
        }
        return appClient;
      }

      // 열린 창이 없으면 새 창으로 열기
      return self.clients.openWindow(targetUrl);
    })()
  );
});

importScripts(
  "https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  messagingSenderId: "...",
  appId: "...",
});

const messaging = firebase.messaging();

// 캐시 네임 정의 (버전 관리 용도)
const CACHE_NAME = "250604 22:40";

// 설치 시, 기존 캐시 삭제하고 새 캐시 준비 (필요시)
self.addEventListener("install", (event) => {
  self.skipWaiting(); // 즉시 활성화
});

// 활성화 시 이전 캐시 삭제
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              return caches.delete(cache);
            }
          })
        )
      )
      .then(() => self.clients.claim()) // 페이지와 서비스워커 동기화
  );
});

messaging.onBackgroundMessage((payload) => {
  // notification 필드가 있는 메시지는 FCM SDK가 이미 알림을 띄우므로
  // 여기서 한 번 더 띄우면 알림이 두 개 표시된다.
  if (payload.notification) return;

  const title = payload.data?.title ?? "FAIN";
  const body = payload.data?.body ?? "낙상이 감지되었습니다.";

  self.registration.showNotification(title, {
    body,
    data: payload.data,
    icon: "/icon-192x192.png",
  });
});
