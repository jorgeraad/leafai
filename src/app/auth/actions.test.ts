import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks
const mockSignInWithOAuth = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: mockSignOut,
    },
  })),
}));

const mockGetOrCreateWorkspace = vi
  .fn()
  .mockResolvedValue({ id: "ws-1", name: "Test Workspace" });

vi.mock("@/lib/db/workspaces", () => ({
  getOrCreateWorkspace: (...args: unknown[]) =>
    mockGetOrCreateWorkspace(...args),
}));

let redirectUrl: string | null = null;
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    redirectUrl = url;
    throw new Error(`REDIRECT:${url}`);
  },
}));

const {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signOut,
} = await import("./actions");

function formData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.append(k, v);
  return fd;
}

describe("auth actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redirectUrl = null;
  });

  describe("signInWithGoogle", () => {
    it("redirects to OAuth URL", async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: "https://accounts.google.com/o/oauth2" },
        error: null,
      });

      await expect(signInWithGoogle()).rejects.toThrow("REDIRECT:");
      expect(redirectUrl).toBe("https://accounts.google.com/o/oauth2");
    });
  });

  describe("signInWithEmail", () => {
    const initial = { error: null, success: null };

    it("returns error when fields are missing", async () => {
      const result = await signInWithEmail(initial, formData({}));
      expect(result.error).toBe("Email and password are required.");
    });

    it("returns error on invalid credentials", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid login credentials" },
      });

      const result = await signInWithEmail(
        initial,
        formData({ email: "a@b.com", password: "wrong" })
      );
      expect(result.error).toBe("Invalid login credentials");
    });

    it("creates workspace and redirects on success", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: {
          user: { id: "u1", user_metadata: { full_name: "Alice" } },
        },
        error: null,
      });

      await expect(
        signInWithEmail(
          initial,
          formData({ email: "a@b.com", password: "pass123" })
        )
      ).rejects.toThrow("REDIRECT:");

      expect(mockGetOrCreateWorkspace).toHaveBeenCalledWith("u1", "Alice");
      expect(redirectUrl).toBe("/w/ws-1");
    });
  });

  describe("signUpWithEmail", () => {
    const initial = { error: null, success: null };

    it("returns error when passwords don't match", async () => {
      const result = await signUpWithEmail(
        initial,
        formData({
          email: "a@b.com",
          password: "pass123",
          confirmPassword: "different",
        })
      );
      expect(result.error).toBe("Passwords do not match.");
    });

    it("returns error when password is too short", async () => {
      const result = await signUpWithEmail(
        initial,
        formData({
          email: "a@b.com",
          password: "short",
          confirmPassword: "short",
        })
      );
      expect(result.error).toBe("Password must be at least 6 characters.");
    });

    it("returns error on Supabase failure", async () => {
      mockSignUp.mockResolvedValue({
        data: { user: null },
        error: { message: "User already registered" },
      });

      const result = await signUpWithEmail(
        initial,
        formData({
          email: "a@b.com",
          password: "pass123",
          confirmPassword: "pass123",
        })
      );
      expect(result.error).toBe("User already registered");
    });

    it("creates workspace and redirects on success", async () => {
      mockSignUp.mockResolvedValue({
        data: { user: { id: "u2" } },
        error: null,
      });

      await expect(
        signUpWithEmail(
          initial,
          formData({
            email: "alice@test.com",
            password: "pass123",
            confirmPassword: "pass123",
          })
        )
      ).rejects.toThrow("REDIRECT:");

      expect(mockGetOrCreateWorkspace).toHaveBeenCalledWith("u2", "alice");
      expect(redirectUrl).toBe("/w/ws-1");
    });
  });

  describe("signOut", () => {
    it("signs out and redirects to /", async () => {
      mockSignOut.mockResolvedValue({ error: null });
      await expect(signOut()).rejects.toThrow("REDIRECT:/");
      expect(redirectUrl).toBe("/");
    });
  });
});
