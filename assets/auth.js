/* Auth partagée (guide + signalements).
 *
 * Session Supabase stockée en localStorage (même origine = un seul login
 * pour toutes les pages / tous les QR codes du site).
 *
 * Deep link : ?next=/notices/gaz.html est transmis à l'emailRedirectTo du
 * magic link, puis repris après connexion.
 */
(function () {
  "use strict";

  var script = document.currentScript;
  var base = (script && script.dataset.base) || ".";
  var gate = script && script.dataset.gate === "1";

  if (!window.supabase || !window.SUPABASE_URL) {
    console.error("auth.js : supabase-js ou supabase-config.js manquant");
    return;
  }

  var sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // localStorage par défaut → pas de cookie HTTP, mais session partagée
      // sur tout jsozeo.github.io/g-4f1e7bf3d2/
    },
  });

  function siteOrigin() {
    // Racine du site (…/g-4f1e7bf3d2), indépendante de la profondeur de la page.
    var path = location.pathname;
    var marker = "/auth/";
    var i = path.indexOf(marker);
    if (i >= 0) return location.origin + path.slice(0, i);
    marker = "/notices/";
    i = path.indexOf(marker);
    if (i >= 0) return location.origin + path.slice(0, i);
    marker = "/app/";
    i = path.indexOf(marker);
    if (i >= 0) return location.origin + path.slice(0, i);
    // Accueil : …/ ou …/index.html
    return location.origin + path.replace(/\/[^/]*$/, "") || location.origin;
  }

  function loginUrl(nextPath) {
    var q = nextPath ? "?next=" + encodeURIComponent(nextPath) : "";
    return siteOrigin() + "/auth/login.html" + q;
  }

  /** N'accepte que des chemins relatifs internes (anti open-redirect). */
  function sanitizeNext(raw) {
    if (!raw || typeof raw !== "string") return "/index.html";
    var v = raw.trim();
    try { v = decodeURIComponent(v); } catch (e) { /* ignore */ }
    if (!v.startsWith("/") || v.startsWith("//") || v.includes("://")) return "/index.html";
    if (v.indexOf("..") >= 0) return "/index.html";
    return v;
  }

  function currentNext() {
    var path = location.pathname;
    // Relatif à la racine du site GitHub Pages
    var root = siteOrigin().replace(location.origin, "") || "";
    var rel = path.startsWith(root) ? path.slice(root.length) : path;
    if (!rel.startsWith("/")) rel = "/" + rel;
    if (rel.endsWith("/")) rel += "index.html";
    return rel + location.search;
  }

  async function getSession() {
    var res = await sb.auth.getSession();
    return res.data.session;
  }

  async function signInWithPassword(email, password) {
    return sb.auth.signInWithPassword({ email: email, password: password });
  }

  async function signInWithMagicLink(email, nextPath) {
    var next = sanitizeNext(nextPath || "/index.html");
    var redirectTo = siteOrigin() + "/auth/login.html?next=" + encodeURIComponent(next);
    return sb.auth.signInWithOtp({
      email: email,
      options: { emailRedirectTo: redirectTo },
    });
  }

  async function signOut() {
    await sb.auth.signOut();
    location.href = loginUrl(currentNext());
  }

  function reveal() {
    document.documentElement.classList.remove("auth-pending");
  }

  async function runGate() {
    var session = await getSession();
    if (session) {
      reveal();
      return session;
    }
    location.replace(loginUrl(currentNext()));
    return null;
  }

  window.SiteAuth = {
    sb: sb,
    getSession: getSession,
    signInWithPassword: signInWithPassword,
    signInWithMagicLink: signInWithMagicLink,
    signOut: signOut,
    sanitizeNext: sanitizeNext,
    loginUrl: loginUrl,
    siteOrigin: siteOrigin,
    currentNext: currentNext,
    reveal: reveal,
  };

  if (gate) {
    runGate();
  }
})();
