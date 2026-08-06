/* Accès familial : popup login/mdp, sans comptes Supabase.
 *
 * - Identifiants dans .venv/.env → hash publié via make_gate_config.py
 * - Session dans localStorage : un seul déverrouillage pour tous les QR
 * - ?next=/notices/… éventuel repris après succès (deep link)
 */
(function () {
  "use strict";

  var script = document.currentScript;
  var gate = script && script.dataset.gate === "1";
  var STORAGE_KEY = "micote_gate_v1";

  function siteOrigin() {
    var path = location.pathname;
    for (var marker of ["/auth/", "/notices/", "/app/"]) {
      var i = path.indexOf(marker);
      if (i >= 0) return location.origin + path.slice(0, i);
    }
    return location.origin + path.replace(/\/[^/]*$/, "") || location.origin;
  }

  function sanitizeNext(raw) {
    if (!raw || typeof raw !== "string") return null;
    var v = raw.trim();
    try { v = decodeURIComponent(v); } catch (e) { /* ignore */ }
    if (!v.startsWith("/") || v.startsWith("//") || v.includes("://")) return null;
    if (v.indexOf("..") >= 0) return null;
    return v;
  }

  function isUnlocked() {
    try {
      var cfg = window.GATE_CONFIG;
      if (!cfg || !cfg.token) return false;
      return localStorage.getItem(STORAGE_KEY) === cfg.token;
    } catch (e) {
      return false;
    }
  }

  function unlock(token) {
    localStorage.setItem(STORAGE_KEY, token);
  }

  function lock() {
    localStorage.removeItem(STORAGE_KEY);
  }

  async function sha256Hex(text) {
    var data = new TextEncoder().encode(text);
    var buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf))
      .map(function (b) { return b.toString(16).padStart(2, "0"); })
      .join("");
  }

  function reveal() {
    document.documentElement.classList.remove("auth-pending");
  }

  function ensureStyles() {
    if (document.getElementById("gate-styles")) return;
    var s = document.createElement("style");
    s.id = "gate-styles";
    s.textContent =
      ".gate-overlay{position:fixed;inset:0;background:rgba(15,35,48,.55);z-index:100;" +
      "display:flex;align-items:center;justify-content:center;padding:18px}" +
      ".gate-box{background:#fff;border-radius:16px;padding:22px 20px;width:100%;max-width:360px;" +
      "box-shadow:0 12px 40px rgba(20,45,60,.25);font-family:inherit}" +
      ".gate-box h2{margin:0 0 6px;font-size:1.2rem;color:#144f64}" +
      ".gate-box p{margin:0 0 14px;color:#55697a;font-size:.92rem}" +
      ".gate-box label{display:block;font-size:.82rem;color:#55697a;margin:10px 0 4px}" +
      ".gate-box input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #e3e9ee;" +
      "border-radius:10px;font:inherit}" +
      ".gate-box .err{color:#7a2a2a;font-size:.85rem;margin-top:10px;min-height:1.2em}" +
      ".gate-box button{margin-top:14px;width:100%;border:none;border-radius:12px;padding:12px;" +
      "background:#1c6e8c;color:#fff;font-weight:600;font-size:1rem;cursor:pointer}";
    document.head.appendChild(s);
  }

  function showPopup(onSuccess) {
    ensureStyles();
    var cfg = window.GATE_CONFIG || {};
    var overlay = document.createElement("div");
    overlay.className = "gate-overlay";
    overlay.innerHTML =
      '<div class="gate-box" role="dialog" aria-modal="true" aria-labelledby="gate-title">' +
      '<h2 id="gate-title">Accès au guide</h2>' +
      "<p>Identifiant et mot de passe de la maison (une seule fois sur ce téléphone).</p>" +
      '<label for="gate-login">Identifiant</label>' +
      '<input id="gate-login" type="text" autocomplete="username" ' +
      (cfg.loginHint ? 'value="' + String(cfg.loginHint).replace(/"/g, "") + '" ' : "") +
      "/>" +
      '<label for="gate-pass">Mot de passe</label>' +
      '<input id="gate-pass" type="password" autocomplete="current-password" />' +
      '<div class="err" id="gate-err"></div>' +
      '<button type="button" id="gate-ok">Entrer</button>' +
      "</div>";
    document.body.appendChild(overlay);
    reveal(); // montrer la popup même si le reste était masqué

    var loginEl = overlay.querySelector("#gate-login");
    var passEl = overlay.querySelector("#gate-pass");
    var errEl = overlay.querySelector("#gate-err");
    passEl.focus();

    async function tryUnlock() {
      errEl.textContent = "";
      var login = (loginEl.value || "").trim().toLowerCase();
      var pass = passEl.value || "";
      if (!login || !pass) {
        errEl.textContent = "Renseigne les deux champs.";
        return;
      }
      var token = await sha256Hex(login + "|" + pass);
      if (!cfg.token || token !== cfg.token) {
        errEl.textContent = "Identifiant ou mot de passe incorrect.";
        passEl.select();
        return;
      }
      unlock(token);
      overlay.remove();
      onSuccess();
    }

    overlay.querySelector("#gate-ok").addEventListener("click", tryUnlock);
    passEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter") tryUnlock();
    });
    loginEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter") passEl.focus();
    });
  }

  function afterUnlock() {
    var params = new URLSearchParams(location.search);
    var next = sanitizeNext(params.get("next"));
    // Sur la page d'auth dédiée, toujours aller vers next (ou l'accueil).
    if (location.pathname.indexOf("/auth/") >= 0) {
      location.replace(siteOrigin() + (next || "/index.html"));
      return;
    }
    // Sur une fiche : si un next est présent (ancien QR), le suivre.
    if (next && next !== location.pathname.replace(siteOrigin().replace(location.origin, ""), "")) {
      // rester sur la page courante si on y est déjà
    }
    reveal();
  }

  window.SiteAuth = {
    isUnlocked: isUnlocked,
    unlock: unlock,
    lock: lock,
    signOut: function () {
      lock();
      location.reload();
    },
    siteOrigin: siteOrigin,
    sanitizeNext: sanitizeNext,
  };

  if (!gate) return;

  if (isUnlocked()) {
    // Page auth avec session déjà ouverte → deep link
    if (location.pathname.indexOf("/auth/") >= 0) {
      afterUnlock();
    } else {
      reveal();
    }
    return;
  }

  showPopup(afterUnlock);
})();
