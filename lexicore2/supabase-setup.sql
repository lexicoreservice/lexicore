-- ============================================================
-- LEXICORE SERVICES — Script de création des tables Supabase
-- Copiez-collez ce code dans Supabase > SQL Editor > New query
-- ============================================================

-- Table des apprenants
CREATE TABLE IF NOT EXISTS students (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  plan          TEXT NOT NULL,         -- '1month' | '2months' | '3months'
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  section       TEXT NOT NULL,         -- 'general' | 'professional' | 'both'
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Table des modules de cours
CREATE TABLE IF NOT EXISTS modules (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  section       TEXT NOT NULL,         -- 'general' | 'professional'
  level         TEXT NOT NULL,         -- 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  description   TEXT DEFAULT '',
  content       TEXT DEFAULT '',       -- Markdown
  video_url     TEXT DEFAULT '',       -- URL YouTube embed
  display_order INTEGER DEFAULT 99,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Désactiver Row Level Security (accès via clé API côté serveur uniquement)
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE modules  DISABLE ROW LEVEL SECURITY;

-- Modules de démonstration (vous pouvez les supprimer ou les modifier)
INSERT INTO modules (title, section, level, description, content, display_order) VALUES
(
  'Alphabet & Salutations',
  'general', 'A1',
  'Apprenez l''alphabet anglais et les salutations de base.',
  E'# Alphabet & Salutations\n\nBienvenue dans votre premier cours !\n\n## L''alphabet\nA B C D E F G H I J K L M N O P Q R S T U V W X Y Z\n\n## Salutations formelles\n- Good morning — Bonjour (matin)\n- Good afternoon — Bonjour (après-midi)\n- Good evening — Bonsoir\n\n## Salutations informelles\n- Hi / Hey — Salut\n- How are you? — Comment vas-tu ?\n- I''m fine, thank you! — Je vais bien, merci !\n\n## À pratiquer\n> Dites bonjour à voix haute en anglais 3 fois par jour !',
  1
),
(
  'Chiffres & Couleurs',
  'general', 'A1',
  'Comptez de 1 à 100 et nommez les couleurs de base.',
  E'# Numbers & Colors\n\n## Numbers 1–10\n1 one · 2 two · 3 three · 4 four · 5 five\n6 six · 7 seven · 8 eight · 9 nine · 10 ten\n\n## Numbers 11–20\n11 eleven · 12 twelve · 13 thirteen · 14 fourteen · 15 fifteen\n16 sixteen · 17 seventeen · 18 eighteen · 19 nineteen · 20 twenty\n\n## Les dizaines\n30 thirty · 40 forty · 50 fifty · 60 sixty · 70 seventy · 80 eighty · 90 ninety · 100 one hundred\n\n## Couleurs de base\n- Red — Rouge\n- Blue — Bleu\n- Green — Vert\n- Yellow — Jaune\n- Orange — Orange\n- Purple — Violet\n- Black — Noir\n- White — Blanc',
  2
),
(
  'Rédiger un email professionnel',
  'professional', 'B1',
  'Maîtrisez la structure et les formules des emails professionnels en anglais.',
  E'# Business Email Writing\n\n## Structure d''un bon email\n1. **Subject line** — Objet clair et précis\n2. **Salutation** — Dear Mr./Ms. [Nom]\n3. **Corps** — But de l''email, détails, action attendue\n4. **Closing** — Best regards / Sincerely\n5. **Signature** — Nom, poste, contact\n\n## Formules d''ouverture utiles\n- I am writing to inform you that...\n- I hope this email finds you well.\n- Further to our conversation...\n- I am writing with regard to...\n\n## Formules de clôture\n- I look forward to hearing from you.\n- Please do not hesitate to contact me.\n- Thank you for your time and consideration.\n\n## Exemple complet\n\n> **Subject:** Meeting Request — Q3 Budget Review\n>\n> Dear Ms. Johnson,\n>\n> I hope this email finds you well. I am writing to request a meeting to discuss the Q3 budget review.\n>\n> Would you be available on Thursday, 15 May at 10:00 AM?\n>\n> Please let me know if this time suits you.\n>\n> Best regards,\n> [Votre nom]',
  1
);

-- Vérification
SELECT 'Tables créées avec succès !' AS message;
SELECT COUNT(*) AS nb_modules FROM modules;
