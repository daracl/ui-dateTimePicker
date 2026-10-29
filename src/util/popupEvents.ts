export interface PopupClient {
  measurePosition(): (() => void) | undefined;
  click(event: Event): void;
  keydown(event: KeyboardEvent): void;
}

// 열린 팝업만 등록합니다. 인스턴스 수와 관계없이 전역 리스너는 종류별 하나입니다.
const clients = new Set<PopupClient>();
let frame: number | undefined;

function schedulePosition() {
  if (frame !== undefined || clients.size === 0) return;
  frame = window.requestAnimationFrame(() => {
    frame = undefined;
    // 모든 레이아웃 읽기를 끝낸 후 스타일을 써서 반복적인 강제 레이아웃을 줄입니다.
    const updates = Array.from(clients, client => ({ client, apply: client.measurePosition() }));
    for (const { client, apply } of updates) {
      if (clients.has(client)) apply?.();
    }
  });
}

function documentClick(event: Event) {
  for (const client of Array.from(clients)) {
    if (clients.has(client)) client.click(event);
  }
}

function documentKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return;
  for (const client of Array.from(clients)) {
    if (clients.has(client)) client.keydown(event);
  }
}

export function registerPopup(client: PopupClient) {
  if (clients.has(client)) return;
  clients.add(client);
  if (clients.size !== 1) return;
  window.addEventListener('resize', schedulePosition, { passive: true });
  window.addEventListener('scroll', schedulePosition, { passive: true, capture: true });
  document.addEventListener('click', documentClick);
  document.addEventListener('keydown', documentKeydown);
}

export function unregisterPopup(client: PopupClient) {
  if (!clients.delete(client) || clients.size !== 0) return;
  window.removeEventListener('resize', schedulePosition);
  window.removeEventListener('scroll', schedulePosition, true);
  document.removeEventListener('click', documentClick);
  document.removeEventListener('keydown', documentKeydown);
  if (frame !== undefined) {
    window.cancelAnimationFrame(frame);
    frame = undefined;
  }
}
