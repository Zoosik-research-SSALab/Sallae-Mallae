type MockStoredObject = {
  body: Uint8Array;
  contentType: string;
};

// Mock uploads live only in memory, so local dev server restarts/HMR can clear them.
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
