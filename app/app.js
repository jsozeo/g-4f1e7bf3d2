/* Case management familial — pas de comptes, noms en texte libre. */
(function () {
  "use strict";

  if (!window.SUPABASE_URL || window.SUPABASE_URL.includes("VOTRE-PROJET")) {
    console.warn("Supabase non configuré : édite assets/supabase-config.js");
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

  const NAME_KEY = "micote_display_name";

  function getSavedName() {
    try { return localStorage.getItem(NAME_KEY) || ""; } catch (e) { return ""; }
  }
  function saveName(name) {
    try { if (name) localStorage.setItem(NAME_KEY, name); } catch (e) { /* ignore */ }
  }

  function listCases() {
    return sb.from("cases").select("*").order("created_at", { ascending: false });
  }

  function getCase(id) {
    return sb.from("cases").select("*").eq("id", id).single();
  }

  function createCase({ title, description, location, reporter_name }) {
    saveName(reporter_name);
    return sb.from("cases").insert({
      title,
      description,
      location,
      reporter_name: reporter_name || null,
      status: "ouvert",
    }).select().single();
  }

  function updateCase(id, fields) {
    if (fields.reporter_name) saveName(fields.reporter_name);
    if (fields.status_changed_by) saveName(fields.status_changed_by);
    return sb.from("cases").update(fields).eq("id", id).select().single();
  }

  function listEvents(caseId) {
    return sb.from("case_events").select("*").eq("case_id", caseId).order("created_at");
  }

  function addComment(caseId, body, author_name) {
    saveName(author_name);
    return sb.from("case_events").insert({
      case_id: caseId,
      author: null,
      author_name: author_name || "inconnu",
      type: "comment",
      body,
    });
  }

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
    sb, STATUS, getSavedName, saveName,
    listCases, getCase, createCase, updateCase,
    listEvents, addComment, uploadPhoto, photoUrl,
    statusBadge, esc,
  };
})();
