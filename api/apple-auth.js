// api/apple-auth.js — Vercel serverless function (Node runtime).
//
// Sign in with Apple CANNOT be completed by a static frontend alone: the
// id_token Apple returns must be verified, and getting a refresh token requires
// a "client secret" that is a JWT signed with your Apple private key (.p8). That
// signing must happen on a server. This file is where that lives.
//
// To make Apple login real you need (all from an Apple Developer account, $99/yr):
//   - a Services ID            -> set as VITE_APPLE_CLIENT_ID on the frontend
//   - a Key (.p8) + Key ID     -> APPLE_KEY_ID, APPLE_PRIVATE_KEY (server env)
//   - your Team ID             -> APPLE_TEAM_ID (server env)
//   - your deployed return URL -> VITE_APPLE_REDIRECT_URI
// Then implement the client-secret JWT + token exchange below. Until then this
// returns 501 and the frontend falls back to guest mode — nothing breaks.
//
// A managed auth provider (Supabase Auth / Firebase Auth / Clerk / Auth0) does
// all of this for you and is the recommended path — see README "Going further".

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const configured =
    process.env.APPLE_TEAM_ID &&
    process.env.APPLE_KEY_ID &&
    process.env.APPLE_PRIVATE_KEY &&
    process.env.VITE_APPLE_CLIENT_ID;

  if (!configured) {
    return res.status(501).json({
      error: "apple_not_configured",
      message:
        "Apple Sign In needs an Apple Developer account and the server env vars " +
        "(APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY). See api/apple-auth.js.",
    });
  }

  // TODO once configured:
  // 1. Build the client secret JWT (ES256) signed with APPLE_PRIVATE_KEY.
  // 2. POST code -> https://appleid.apple.com/auth/token to exchange for tokens.
  // 3. Verify the returned id_token against Apple's public keys
  //    (https://appleid.apple.com/auth/keys), checking iss/aud/exp.
  // 4. Return { email, sub } to the client; issue your own session if desired.
  return res.status(501).json({ error: "not_implemented" });
}
