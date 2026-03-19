import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the env key before importing
vi.stubEnv("TOKEN_ENCRYPTION_KEY", "a".repeat(64));

const { encrypt, decrypt } = await import("@/server/lib/encryption");

describe("Encryption", () => {
  it("encrypts and decrypts a string correctly", () => {
    const plaintext = "sk-test-oauth-token-12345";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
    expect(encrypted).not.toBe(plaintext);
  });

  it("produces format iv:tag:ciphertext", () => {
    const encrypted = encrypt("hello");
    const parts = encrypted.split(":");
    expect(parts).toHaveLength(3);
    // IV = 12 bytes = 24 hex chars
    expect(parts[0]).toHaveLength(24);
    // Tag = 16 bytes = 32 hex chars
    expect(parts[1]).toHaveLength(32);
    // Ciphertext exists
    expect(parts[2].length).toBeGreaterThan(0);
  });

  it("produces different ciphertexts for same input (random IV)", () => {
    const a = encrypt("same-input");
    const b = encrypt("same-input");
    expect(a).not.toBe(b);
  });

  it("fails to decrypt tampered data", () => {
    const encrypted = encrypt("secret");
    const parts = encrypted.split(":");
    // Flip a byte in ciphertext
    const tampered = `${parts[0]}:${parts[1]}:ff${parts[2].slice(2)}`;
    expect(() => decrypt(tampered)).toThrow();
  });

  it("fails on invalid format", () => {
    expect(() => decrypt("not-valid")).toThrow("Invalid encrypted string format");
  });
});
