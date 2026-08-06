/* App de case management — logique partagée (client Supabase + helpers). */
(function () {
  "use strict";

  if (!window.SUPABASE_URL || window.SUPABASE_URL.includes("VOTRE-PROJET")) {
    console.warn("Supabase non configuré : édite app/supabase-config.js");
  }

  const sb = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
  );

  const STATUS = {
    ouvert:   { label: "Ouvert",   cls: "st-ouvert" },
    en_cours: { label: "En cours", cls: "st-encours" },
    bloque:   { label: "Bloqué",   cls: "st-bloque" },
    ferme:    { label: "Fermé",    cls: "st-ferme" },
    rejete:   { label: "Rejeté",   cls: "st-rejete" },
  };

  // ---------- Auth ----------
  async function getSession() {
    const { data } = await sb.auth.getSession();
    return data.session;
  }

  async function getProfile() {
    const session = await getSession();
    if (!session) return null;
    const { data } = await sb
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", session.user.id)
      .single();
    return data || { id: session.user.id, role: "user" };
  }

  // Redirige vers la page de login centrale si non connecté. Renvoie le profil sinon.
  async function requireAuth() {
    const session = await getSession();
    if (!session) {
      const next = "/app/" + (location.pathname.split("/").pop() || "index.html") + location.search;
      if (window.SiteAuth) {
        window.location.href = window.SiteAuth.loginUrl(next);
      } else {
        window.location.href = "../auth/login.html?next=" + encodeURIComponent(next);
      }
      return null;
    }
    return await getProfile();
  }

  async function signInWithEmail(email) {
    const next = "/app/index.html";
    if (window.SiteAuth) {
      return window.SiteAuth.signInWithMagicLink(email, next);
    }
    return sb.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          window.location.origin +
          window.location.pathname.replace(/\/app\/.*$/, "/auth/login.html") +
          "?next=" + encodeURIComponent(next),
      },
    });
  }

  async function signOut() {
    await sb.auth.signOut();
    if (window.SiteAuth) {
      window.location.href = window.SiteAuth.loginUrl("/app/index.html");
    } else {
      window.location.href = "../auth/login.html?next=" + encodeURIComponent("/app/index.html");
    }
  }

  // ---------- Cases (CRUD) ----------
  // RLS filtre automatiquement : un user ne voit que ses cas, l'admin voit tout.
  async function listCases() {
    return sb.from("cases").select("*").order("created_at", { ascending: false });
  }

  async function getCase(id) {
    return sb.from("cases").select("*").eq("id", id).single();
  }

  async function createCase({ title, description, location }) {
    const session = await getSession();
    return sb.from("cases").insert({
      title,
      description,
      location,
      created_by: session.user.id,
    }).select().single();
  }

  async function updateCase(id, fields) {
    return sb.from("cases").update(fields).eq("id", id).select().single();
  }

  async function updateStatus(id, status) {
    // Autorisé uniquement pour les admins (trigger côté BDD).
    return sb.from("cases").update({ status }).eq("id", id).select().single();
  }

  async function listEvents(caseId) {
    return sb.from("case_events").select("*").eq("case_id", caseId).order("created_at");
  }

  async function addComment(caseId, body) {
    const session = await getSession();
    return sb.from("case_events").insert({ case_id: caseId, author: session.user.id, type: "comment", body });
  }

  // ---------- Photos (Storage) ----------
  async function uploadPhoto(caseId, file) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${caseId}/${Date.now()}.${ext}`;
    const { error } = await sb.storage.from("case-photos").upload(path, file);
    if (error) return { error };
    await updateCase(caseId, { photo_path: path });
    return { path };
  }

  async function photoUrl(path) {
    if (!path) return null;
    const { data } = await sb.storage.from("case-photos").createSignedUrl(path, 3600);
    return data ? data.signedUrl : null;
  }

  // ---------- Utils ----------
  function statusBadge(status) {
    const s = STATUS[status] || { label: status, cls: "" };
    return `<span class="badge ${s.cls}">${s.label}</span>`;
  }

  function esc(str) {
    return (str == null ? "" : String(str)).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  window.CaseApp = {
    sb, STATUS,
    getSession, getProfile, requireAuth, signInWithEmail, signOut,
    listCases, getCase, createCase, updateCase, updateStatus,
    listEvents, addComment, uploadPhoto, photoUrl,
    statusBadge, esc,
  };
})();
