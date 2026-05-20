// =====================================================================
// 한국타이어 안전 패트롤 — Service Worker
// 역할: 백그라운드 푸시 알림 수신 및 표시
// =====================================================================

const CACHE_NAME = 'safety-patrol-v1';

// 설치
self.addEventListener('install', e => {
  self.skipWaiting();
});

// 활성화
self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

// ── 푸시 알림 수신 ───────────────────────────────────────────────────
self.addEventListener('push', e => {
  let data = { title: '⚠️ 안전 패트롤 미완료', body: '점검을 아직 완료하지 않았습니다. 지금 바로 점검해 주세요.', url: '/' };
  if (e.data) {
    try { data = { ...data, ...e.data.json() }; } catch(_) {}
  }

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    'https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f6e1.png',
      badge:   'https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f6e1.png',
      tag:     'safety-patrol-reminder',
      renotify: true,
      requireInteraction: true,   // 직접 닫기 전까지 유지
      vibrate: [200, 100, 200],
      data:    { url: data.url },
      actions: [
        { action: 'open',    title: '지금 점검하기' },
        { action: 'dismiss', title: '나중에' },
      ]
    })
  );
});

// ── 알림 클릭 ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // 이미 열려있으면 포커스
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // 없으면 새 창
      return clients.openWindow(e.notification.data?.url || '/');
    })
  );
});

// ── 주기적 백그라운드 동기화 (Background Sync) ───────────────────────
self.addEventListener('periodicsync', e => {
  if (e.tag === 'patrol-reminder') {
    e.waitUntil(checkAndNotify());
  }
});

async function checkAndNotify() {
  // 클라이언트에 메시지 전달해서 미완료 여부 확인
  const list = await clients.matchAll({ type: 'window' });
  if (list.length === 0) {
    // 앱이 닫혀있으면 바로 알림
    await self.registration.showNotification('⚠️ 안전 패트롤 점검 필요', {
      body: '오늘 점검이 완료되지 않았습니다. 지금 바로 확인해 주세요.',
      icon: 'https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f6e1.png',
      requireInteraction: true,
      tag: 'safety-patrol-reminder',
      renotify: true,
    });
  }
}
