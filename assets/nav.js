/* Menu de navigation partagé : injecte le bouton hamburger et le tiroir
   dans le bandeau de chaque page. Le chemin racine est déclaré par la balise
   script elle-même (data-base), les pages n'étant pas à la même profondeur. */
(function () {
  "use strict";

  var base = (document.currentScript && document.currentScript.dataset.base) || ".";

  /* Un objet { group: … } insère un intertitre dans le tiroir. */
  var LINKS = [
    { href: "/index.html", label: "Accueil du guide", icon: "🏠" },
    { href: "/app/index.html", label: "Signaler un problème", icon: "🔧" },

    { group: "Arrivée & départ" },
    { href: "/notices/ouverture-maison.html", label: "Ouvrir la maison", icon: "🔑" },
    { href: "/notices/fermeture-maison.html", label: "Fermer la maison", icon: "🚪" },
    { href: "/notices/eau.html", label: "Réseaux d'eau", icon: "💧" },

    { group: "Chauffage" },
    { href: "/notices/chauffage-electrique.html", label: "Radiateurs", icon: "🌡️" },
    { href: "/notices/poele-bois.html", label: "Poêle à bois", icon: "🔥" },
    { href: "/notices/gaz.html", label: "Le gaz", icon: "🔵" },

    { group: "Déchets & jardin" },
    { href: "/notices/gestion-dechets.html", label: "Gestion des déchets", icon: "🗑️" },
    { href: "/notices/dechetterie-acces.html", label: "Accès à la déchetterie", icon: "🎫" },
    { href: "/notices/dechetterie-verte.html", label: "Déchetterie verte", icon: "🍃" },
    { href: "/notices/compost.html", label: "Le compost", icon: "🌱" },
    { href: "/notices/entretien-abords.html", label: "Entretien des abords", icon: "🌳" },

    { group: "Intendance" },
    { href: "/notices/plan-maison.html", label: "Plan de la maison", icon: "🏠" },
    { href: "/notices/quantites-alimentaires.html", label: "Quantités alimentaires", icon: "🍽️" },
    { href: "/notices/lits-bebe.html", label: "Lits bébé", icon: "🛏️" },
    { href: "/notices/electricite.html", label: "Tableaux électriques", icon: "⚡" },
  ];

  function build() {
    var topbar = document.querySelector(".topbar");
    if (!topbar) return;

    var btn = document.createElement("button");
    btn.className = "navbtn";
    btn.type = "button";
    btn.setAttribute("aria-label", "Ouvrir le menu");
    btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = "<span></span><span></span><span></span>";
    topbar.appendChild(btn);

    var overlay = document.createElement("div");
    overlay.className = "navoverlay";

    var drawer = document.createElement("nav");
    drawer.className = "navdrawer";
    drawer.setAttribute("aria-label", "Navigation principale");

    var current = location.pathname.replace(/\/$/, "/index.html");
    var html =
      '<div class="head"><span class="t">Résidence · Messery</span>' +
      '<button type="button" aria-label="Fermer le menu">&times;</button></div>';
    LINKS.forEach(function (l) {
      if (l.group) {
        html += '<p class="grp">' + l.group + "</p>";
        return;
      }
      var active = current.slice(-l.href.length) === l.href ? " current" : "";
      html +=
        '<a class="' + active.trim() + '" href="' + base + l.href + '">' +
        '<span class="ic">' + l.icon + "</span>" + l.label + "</a>";
    });
    drawer.innerHTML = html;

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    function setOpen(open) {
      drawer.classList.toggle("open", open);
      overlay.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open ? "hidden" : "";
    }

    btn.addEventListener("click", function () {
      setOpen(!drawer.classList.contains("open"));
    });
    overlay.addEventListener("click", function () { setOpen(false); });
    drawer.querySelector(".head button").addEventListener("click", function () { setOpen(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
