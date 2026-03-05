// Shared cookie config for manual JWT encode/decode
// Must match what getToken() expects from NextAuth
export const SESSION_COOKIE = "__Secure-authjs.session-token";
export const SESSION_SECRET = process.env.AUTH_SECRET!;
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days
