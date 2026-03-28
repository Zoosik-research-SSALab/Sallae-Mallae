type MockStoredObject = {
  body: Uint8Array;
  contentType: string;
};

const mockStorageStore = new Map<string, MockStoredObject>();

function normalizeMockStorageKey(key: string) {
  return key.replace(/^\/+/, "");
}

export function saveMockStorageObject(key: string, value: MockStoredObject) {
  mockStorageStore.set(normalizeMockStorageKey(key), value);
}

export function getMockStorageObject(key: string) {
  return mockStorageStore.get(normalizeMockStorageKey(key)) ?? null;
}
