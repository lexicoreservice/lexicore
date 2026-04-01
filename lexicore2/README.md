# Lexicore Services — Guide de configuration Supabase

## Étape 1 — Créer votre base de données Supabase (gratuit)

1. Allez sur **https://supabase.com** et créez un compte gratuit
2. Cliquez **"New project"**
3. Donnez un nom : `lexicore`
4. Choisissez un mot de passe pour la base (notez-le) LbIvo88lKModwyhx
5. Région : choisissez **West EU (Ireland)** ou la plus proche
6. Cliquez **"Create new project"** — attendez \~2 minutes

\---

## Étape 2 — Créer les tables

1. Dans Supabase, allez dans le menu **SQL Editor** (icône base de données)
2. Cliquez **"New query"**
3. Copiez-collez tout le contenu du fichier **`supabase-setup.sql`**
4. Cliquez **"Run"** (bouton vert)
5. Vous devez voir : `Tables créées avec succès !`

\---

## Étape 3 — Récupérer vos clés Supabase

1. Dans Supabase, allez dans **Settings → API**
2. Copiez ces deux valeurs :

   * **Project URL** → ex: `https://abcdefgh.supabase.co`
   * **anon / public key** → une longue clé commençant par `eyJ...`

\---

## Étape 4 — Configurer Netlify

Dans votre site Netlify → **Site configuration → Environment variables**, ajoutez :

|Variable|Valeur|
|-|-|
|`ADMIN\_PASSWORD`|Votre mot de passe admin|
|`JWT\_SECRET`|Chaîne aléatoire 32+ caractères|
|`SUPABASE\_URL`|L'URL de votre projet Supabase|
|`SUPABASE\_KEY`|La clé anon/public de Supabase|

Après avoir ajouté les variables, allez dans **Deploys → Trigger deploy → Deploy site** pour redémarrer.

\---

## Étape 5 — Mettre à jour les fichiers du site

Remplacez le dossier `netlify/functions/api.js` par celui fourni dans ce zip (version Supabase).

Puis re-déployez sur Netlify (glissez-déposez à nouveau le dossier, ou poussez sur GitHub).

\---

## Structure des fichiers

```
lexicore/
├── netlify.toml
├── supabase-setup.sql        ← Script SQL à exécuter dans Supabase
├── netlify/
│   └── functions/
│       └── api.js            ← Backend avec Supabase
└── public/
    ├── index.html            ← Page d'accueil
    ├── admin/index.html      ← Panneau admin
    └── student/index.html    ← Espace apprenant
```

\---

## ✅ Test final

Après déploiement, testez :

* `/admin/` → connexion avec votre `ADMIN\_PASSWORD`
* Ajoutez un module → vérifiez qu'il apparaît après rechargement de page
* Ajoutez un apprenant test → connectez-vous sur `/student/`

Les données sont maintenant **permanentes** dans Supabase !

