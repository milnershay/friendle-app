import { vi, beforeEach } from 'vitest';

// Mock localStorage with actual storage behavior
const storage: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => storage[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    storage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete storage[key];
  }),
  clear: vi.fn(() => {
    Object.keys(storage).forEach(key => delete storage[key]);
  }),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.localStorage = localStorageMock as any;

// Reset storage before each test
beforeEach(() => {
  Object.keys(storage).forEach(key => delete storage[key]);
  vi.clearAllMocks();
});
