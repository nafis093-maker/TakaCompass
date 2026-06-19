// Auth providers.
// Google: fully client-side via Google Identity Services (token flow). Needs a
//   Client ID in VITE_GOOGLE_CLIENT_ID, with your deployed URL added to the
//   OAuth client's "Authorized JavaScript origins".
// Apple: requires a Services ID + a server-side token verifier (see
//   api/apple-auth.js) + an Apple Developer account. Configured via
//   VITE_APPLE_CLIENT_ID / VITE_APPLE_REDIRECT_URI. Inert until you set those.

const env = () => ({
  gid: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  aid: import.meta.env.VITE_APPLE_CLIENT_ID,
  appleRedirect: import.meta.env.VITE_APPLE_REDIRECT_URI,
});

export const googleConfigured = () => !!env().gid;
export const appleConfigured = () => !!env().aid;

function parseJwt(t) {
  try {
    return JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch { return {}; }
}

export function signInWithGoogle() {
  return new Promise((resolve, reject) => {
    const { gid } = env();
    if (!gid) return reject(new Error("not-configured"));
    if (!window.google?.accounts?.oauth2) return reject(new Error("gsi-not-loaded"));
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: gid,
      scope: "openid email profile",
      callback: async (resp) => {
        if (resp.error) return reject(resp);
        try {
          const u = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${resp.access_token}` },
          }).then((r) => r.json());
          resolve({ provider: "google", name: u.name || u.email, email: u.email, picture: u.picture });
        } catch (e) { reject(e); }
      },
    });
    client.requestAccessToken();
  });
}

export async function signInWithApple() {
  const { aid, appleRedirect } = env();
  if (!aid) throw new Error("not-configured");
  if (!window.AppleID) throw new Error("appleid-not-loaded");
  window.AppleID.auth.init({ clientId: aid, scope: "name email", redirectURI: appleRedirect, usePopup: true });
  const res = await window.AppleID.auth.signIn();
  // SECURITY: the id_token must be verified server-side (api/apple-auth.js)
  // before you trust it. This client-side decode is for display only.
  const claims = parseJwt(res.authorization.id_token);
  const name = res.user?.name ? `${res.user.name.firstName} ${res.user.name.lastName}` : (claims.email || "Apple user");
  return { provider: "apple", name, email: claims.email || "apple-user" };
}
