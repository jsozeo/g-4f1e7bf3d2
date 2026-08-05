# Guide de la résidence — Messery

Guide pratique numérique de la résidence secondaire à **Messery** (Haute-Savoie).
Objectif : numériser les notes et consignes affichées un peu partout dans la maison
pour les rendre accessibles en ligne, facilement, via un **QR code** depuis un téléphone.

## 🌐 Site en ligne
👉 **https://jsozeo.github.io/g-4f1e7bf3d2/**

> 🔒 URL volontairement non devinable. Ne pas la publier ni la référencer publiquement.

## 📋 Notices disponibles
| Notice | Page web | Source markdown |
|--------|----------|-----------------|
| Gestion des déchets | [gestion-dechets.html](notices/gestion-dechets.html) | [gestion-dechets.md](notices/gestion-dechets.md) |

## 🗂️ Structure du projet
```
.
├── index.html              # Accueil : liste des notices
├── assets/
│   └── style.css           # Design mobile-first
├── notices/
│   ├── gestion-dechets.html   # Notice (page web)
│   └── gestion-dechets.md     # Notice (markdown)
├── images/
│   ├── gestion-dechets-source.pdf   # PDF/photo d'origine
│   ├── gestion-dechets-source.png   # Photo d'origine (PNG)
│   └── gestion-dechets-photo.jpg    # Version web allégée
├── qrcodes/                # QR codes générés vers le site
└── README.md
```

## ➕ Ajouter une nouvelle notice
1. Prendre en photo la note affichée et l'enregistrer dans `images/`.
2. Créer `notices/ma-notice.html` (sur le modèle de `gestion-dechets.html`) et éventuellement `notices/ma-notice.md`.
3. Ajouter une carte vers cette notice dans `index.html`.
4. Committer et pousser : GitHub Pages met le site à jour automatiquement.
5. (Optionnel) Générer un QR code dédié vers la nouvelle page.

## 📱 QR codes
Les QR codes se trouvent dans `qrcodes/` et pointent vers le site en ligne.
Il suffit de les imprimer et de les afficher dans la maison.

## 🔧 Case management (signalements) — Supabase

Application de déclaration de dysfonctionnements, avec authentification et rôles.

**Architecture :** front statique (GitHub Pages) + `supabase-js` (navigateur) → Supabase
(Auth + Postgres + RLS). **Aucun serveur/Lambda à héberger.** Les autorisations sont
faites par les *Row Level Security policies* de Postgres. Des *Edge Functions* Supabase
ne seront ajoutées que plus tard, si l'on veut un écran d'admin de gestion des comptes.

**États d'un cas :** `ouvert` · `en_cours` · `bloque` · `ferme` · `rejete`.
(`bloque` = en attente d'un tiers : artisan, pièce, devis.)
**Rôles :** `user` (crée et modifie ses propres cas) · `admin` (voit/gère tout, change les statuts, gère les comptes).

### Mise en route
1. Créer un projet sur [supabase.com](https://supabase.com) (région EU recommandée).
2. **SQL Editor** → coller et exécuter [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
3. **Project Settings → API** → copier *Project URL* et *anon public key*
   dans [`app/supabase-config.js`](app/supabase-config.js).
4. **Authentication → URL Configuration** → ajouter l'URL du site
   (`https://jsozeo.github.io/g-4f1e7bf3d2/app/index.html`) aux *Redirect URLs*.
5. Se connecter une 1re fois (lien magique), puis se promouvoir admin via SQL :
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'toi@exemple.com');
   ```
6. Inviter les autres utilisateurs depuis **Authentication → Users → Invite**.

### Fichiers de l'app
```
app/
├── login.html          # Connexion par lien magique
├── index.html          # Liste des signalements (filtrée par RLS)
├── case.html           # Créer / consulter / modifier un cas + commentaires
├── app.js              # Client Supabase + helpers (auth, CRUD, storage)
├── app.css             # Styles de l'app
└── supabase-config.js  # URL + anon key (À REMPLIR)
supabase/
└── migrations/0001_init.sql   # Schéma + RLS + triggers + bucket photos
```

> ⚠️ La clé **`service_role`** ne doit JAMAIS être mise dans `app/`. Réserve-la aux
> secrets d'une Edge Function le jour où tu ajouteras la gestion admin des comptes.

### Récapitulatif périodique (toutes les 2 semaines)

Un récapitulatif par utilisateur est calculé automatiquement et **stocké dans la table
`digest_runs`** : chacun obtient ses propres cas, un admin obtient la vue globale.

Contenu : total et répartition par état, nouveaux cas, cas clos ou rejetés sur la période,
cas restant à traiter (triés du plus ancien au plus récent) et **alerte sur les cas sans
activité** depuis plus de 14 jours.

Planification : `pg_cron` déclenche `run_biweekly_digest()` chaque lundi à 06:00 UTC ;
la fonction ne s'exécute que les semaines ISO paires, soit une fois tous les 14 jours.

```sql
-- Générer un récapitulatif immédiatement (test)
select public.generate_digests();
-- Consulter le dernier récapitulatif d'un utilisateur
select payload from public.digest_runs order by created_at desc limit 1;
```

**⚠️ L'envoi par email n'est pas encore branché.** Le service d'email intégré de Supabase
est réservé aux messages d'authentification et ne peut pas envoyer de contenu personnalisé.
Pour l'envoi réel (phase 2), il faudra une Edge Function appelant un fournisseur
(Resend, Brevo…) ou un SMTP : elle lira `digest_runs`, enverra les messages et renseignera
`sent_at`. La logique de calcul restera inchangée.

## 🔒 Sécurité et infos sensibles

Ce site est **public** (GitHub Pages l'est toujours). La protection repose sur :
- une **URL non devinable** (nom de dépôt aléatoire) ;
- `noindex` + `robots.txt` → non référencé par les moteurs de recherche ;
- aucune mention identifiante dans les métadonnées / la description du dépôt.

**⚠️ Ne JAMAIS mettre en ligne** : codes d'alarme, codes de portail/boîte à clés,
codes wifi sensibles, coordonnées privées, numéros de contrats, etc.

Convention pour ces infos :
- Tout fichier dans `prive/`, ou nommé `*.prive.*` / `*.secret.*`, est **ignoré par git**
  (voir `.gitignore`) et reste donc **uniquement sur ton ordinateur**.
- Pour partager un secret ponctuel, préfère un gestionnaire de mots de passe
  (partage de note chiffrée), un message éphémère, ou l'affichage physique dans la maison.
- Si un vrai accès protégé en ligne devient nécessaire, passer par une authentification
  devant le site (ex. Cloudflare Access), plutôt que de publier le secret en clair.
