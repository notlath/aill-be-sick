/**
 * Global test setup for Vitest.
 * Mocks Next.js server-side modules that are not available in the test environment.
 */
import { vi } from "vitest";

// Mock next/cache (revalidatePath, revalidateTag, cacheLife, cacheTag)
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

// Mock next/navigation (redirect)
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

// Mock next/server (connection)
vi.mock("next/server", () => ({
  connection: vi.fn(),
}));

// Mock next/headers (cookies)
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(() => []),
  })),
}));
