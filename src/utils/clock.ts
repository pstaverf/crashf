let offset = 0;
let synced = false;

export function syncClock(serverTimeMs: number, rttMs: number): void {
  const estimate = serverTimeMs + rttMs / 2 - Date.now();
  offset = synced ? offset * 0.7 + estimate * 0.3 : estimate;
  synced = true;
}

export const serverNow = (): number => Date.now() + offset;
