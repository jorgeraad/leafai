import { describe, it, expect, vi, beforeEach } from "vitest";

const mockExchangeCodeForSession = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
      getUser: mockGetUser,
    },
  })),
}));

const mockGetOrCreateWorkspace = vi
  .fn()
  .mockResolvedValue({ id: "ws-1", name: "Test" });

vi.mock("@/lib/db/workspaces", () => ({
  getOrCreateWorkspace: (...args: unknown[]) =>
    mockGetOrCreateWorkspace(...args),
}));

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
});

const { GET } = await import("./route");

function makeRequest(params: string) {
  return new Request(`http://localhost:3000/auth/callback?${params}`);
}

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /login?error=missing_code when no code", async () => {
    const res = await GET(makeRequest(""));
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/login?error=missing_code"
    );
  });

  it("redirects to /login?error=exchange_failed on exchange error", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: { message: "bad code" },
    });

    const res = await GET(makeRequest("code=abc"));
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/login?error=exchange_failed"
    );
  });

  it("creates workspace and redirects on success", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "u1",
          email: "alice@test.com",
          user_metadata: { full_name: "Alice" },
        },
      },
    });

    const res = await GET(makeRequest("code=abc"));
    expect(mockGetOrCreateWorkspace).toHaveBeenCalledWith("u1", "Alice");
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/w/ws-1"
    );
  });

  it("uses email prefix as display name when no full_name", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "u2",
          email: "bob@test.com",
          user_metadata: {},
        },
      },
    });

    const res = await GET(makeRequest("code=abc"));
    expect(mockGetOrCreateWorkspace).toHaveBeenCalledWith("u2", "bob");
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/w/ws-1"
    );
  });
});
