import { describe, expect, it } from 'vitest';
import { CROWD_STORAGE_KEY } from '../net/community';
import { CROWD_DEVICE_KEY, SHARE_STORAGE_KEY, getCrowdSharing, inConsentRegion, readCrowdDeviceId, setCrowdSharing } from './privacy';

function memStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, String(v)),
  };
}

describe('crowd sharing consent', () => {
  it('uses the same key as the crowd store', () => {
    expect(CROWD_DEVICE_KEY).toBe(CROWD_STORAGE_KEY);
  });

  it('treats the EEA, UK, Switzerland and unknown zones as consent regions', () => {
    for (const tz of ['Europe/Berlin', 'Europe/London', 'Europe/Zurich', 'Europe/Dublin', 'Atlantic/Canary', 'Asia/Nicosia', 'Atlantic/Reykjavik', ''])
      expect(inConsentRegion(tz)).toBe(true);
    for (const tz of ['America/Denver', 'America/New_York', 'Asia/Tokyo', 'Australia/Sydney']) expect(inConsentRegion(tz)).toBe(false);
  });

  it('defaults on in the US and off in the EU until chosen', () => {
    const s = memStorage();
    expect(getCrowdSharing(s, 'America/Denver')).toEqual({ on: true, chosen: false });
    expect(getCrowdSharing(s, 'Europe/Paris')).toEqual({ on: false, chosen: false });
    setCrowdSharing(true, s);
    expect(getCrowdSharing(s, 'Europe/Paris')).toEqual({ on: true, chosen: true });
    expect(s.getItem(SHARE_STORAGE_KEY)).toBe('1');
  });

  it('turning it off deletes the device id', () => {
    const s = memStorage();
    s.setItem(CROWD_DEVICE_KEY, JSON.stringify({ device: '0b9f6c1e-3a52-4d2e-9a43-2f1d8c7b6a50', sent: [] }));
    expect(readCrowdDeviceId(s)).toBe('0b9f6c1e-3a52-4d2e-9a43-2f1d8c7b6a50');
    setCrowdSharing(false, s);
    expect(getCrowdSharing(s, 'America/Denver')).toEqual({ on: false, chosen: true });
    expect(s.getItem(CROWD_DEVICE_KEY)).toBeNull();
    expect(readCrowdDeviceId(s)).toBeNull();
  });

  it('survives blocked storage', () => {
    expect(getCrowdSharing(null, 'Europe/Rome')).toEqual({ on: false, chosen: false });
    expect(() => setCrowdSharing(false, null)).not.toThrow();
    expect(readCrowdDeviceId(null)).toBeNull();
  });
});
