// netlify/functions/api.js
// Lexicore Services — Backend avec Supabase (données permanentes)
//
// Variables d'environnement requises dans Netlify :
//   ADMIN_PASSWORD   → votre mot de passe admin
//   JWT_SECRET       → chaîne aléatoire longue (32+ caractères)
//   SUPABASE_URL     → ex: https://xxxx.supabase.co
//   SUPABASE_KEY     → votre clé "anon/public" Supabase

const crypto = require("crypto");

// ─── JWT helpers ─────────────────────────────────────────────────────────────
function signToken(payload, secret) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}
function verifyToken(token, secret) {
  try {
    const [header, body, sig] = token.split(".");
    const expected = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
    if (sig !== expected) return null;
    const payload = JSON.parse(atob(body));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch { return null; }
}

// ─── Supabase REST client (sans SDK, zéro dépendance) ────────────────────────
function supabase(url, key) {
  const base = `${url}/rest/v1`;
  const headers = {
    "Content-Type": "application/json",
    "apikey": key,
    "Authorization": `Bearer ${key}`,
    "Prefer": "return=representation",
  };

  return {
    async select(table, query = "") {
      const res = await fetch(`${base}/${table}?${query}`, { headers });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    async insert(table, data) {
      const res = await fetch(`${base}/${table}`, {
        method: "POST", headers, body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    async update(table, match, data) {
      const query = Object.entries(match).map(([k,v]) => `${k}=eq.${encodeURIComponent(v)}`).join("&");
      const res = await fetch(`${base}/${table}?${query}`, {
        method: "PATCH", headers, body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    async delete(table, match) {
      const query = Object.entries(match).map(([k,v]) => `${k}=eq.${encodeURIComponent(v)}`).join("&");
      const res = await fetch(`${base}/${table}?${query}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error(await res.text());
      return true;
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function hashPassword(pw) {
  return crypto.createHash("sha256").update(pw + "lexicore_salt").digest("hex");
}
function cors(res) {
  return {
    ...res,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Content-Type": "application/json",
      ...(res.headers || {}),
    },
  };
}
function json(statusCode, body) { return cors({ statusCode, body: JSON.stringify(body) }); }
function getToken(event) { return (event.headers.authorization || "").replace("Bearer ", ""); }

// ─── Main handler ─────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return cors({ statusCode: 200, body: "" });

  const SECRET   = process.env.JWT_SECRET       || "lexicore_dev_secret_change_me";
  const ADMIN_PW = process.env.ADMIN_PASSWORD    || "admin123";
  const SB_URL   = process.env.SUPABASE_URL      || "";
  const SB_KEY   = process.env.SUPABASE_KEY      || "";

  if (!SB_URL || !SB_KEY) {
    return json(500, { error: "Supabase non configuré. Ajoutez SUPABASE_URL et SUPABASE_KEY dans Netlify." });
  }

  const db = supabase(SB_URL, SB_KEY);
  const path = event.path.replace("/.netlify/functions/api", "").replace("/api", "");
  const method = event.httpMethod;
  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch {}

  // ── Admin login ─────────────────────────────────────────────────────────────
  if (path === "/admin/login" && method === "POST") {
    if (body.password !== ADMIN_PW) return json(401, { error: "Mot de passe incorrect" });
    const token = signToken({ role: "admin", exp: Date.now() + 86400000 * 7 }, SECRET);
    return json(200, { token });
  }

  // ── Student login ───────────────────────────────────────────────────────────
  if (path === "/student/login" && method === "POST") {
    try {
      const rows = await db.select("students", `email=eq.${encodeURIComponent(body.email?.toLowerCase())}`);
      const student = rows[0];
      if (!student || student.password_hash !== hashPassword(body.password)) {
        return json(401, { error: "Email ou mot de passe incorrect" });
      }
      if (Date.now() > new Date(student.end_date).getTime()) {
        return json(403, { error: "Votre accès a expiré. Contactez Lexicore pour renouveler." });
      }
      const token = signToken({ role: "student", email: student.email, exp: Date.now() + 86400000 }, SECRET);
      return json(200, {
        token,
        student: { name: student.name, email: student.email, plan: student.plan, endDate: student.end_date, section: student.section }
      });
    } catch (e) { return json(500, { error: e.message }); }
  }

  // ── Admin: students ─────────────────────────────────────────────────────────
  if (path.startsWith("/admin/students")) {
    const tok = verifyToken(getToken(event), SECRET);
    if (!tok || tok.role !== "admin") return json(401, { error: "Non autorisé" });

    if (method === "GET") {
      try {
        const rows = await db.select("students", "order=name.asc");
        return json(200, rows.map(s => ({
          name: s.name, email: s.email, plan: s.plan,
          startDate: s.start_date, endDate: s.end_date, section: s.section
        })));
      } catch (e) { return json(500, { error: e.message }); }
    }

    if (method === "POST") {
      const { name, email, password, plan, startDate, section } = body;
      if (!name || !email || !password || !plan || !startDate || !section)
        return json(400, { error: "Tous les champs sont requis" });

      const start = new Date(startDate);
      const months = plan === "1month" ? 1 : plan === "2months" ? 2 : 3;
      const end = new Date(start);
      end.setMonth(end.getMonth() + months);

      try {
        await db.insert("students", {
          name,
          email: email.toLowerCase(),
          password_hash: hashPassword(password),
          plan,
          start_date: start.toISOString().split("T")[0],
          end_date: end.toISOString().split("T")[0],
          section,
        });
        return json(201, { message: "Apprenant créé", endDate: end.toISOString().split("T")[0] });
      } catch (e) { return json(500, { error: e.message }); }
    }

    if (method === "DELETE") {
      const email = decodeURIComponent(path.split("/").pop());
      try {
        await db.delete("students", { email });
        return json(200, { message: "Apprenant supprimé" });
      } catch (e) { return json(500, { error: e.message }); }
    }
  }

  // ── Admin: modules ──────────────────────────────────────────────────────────
  if (path.startsWith("/admin/modules")) {
    const tok = verifyToken(getToken(event), SECRET);
    if (!tok || tok.role !== "admin") return json(401, { error: "Non autorisé" });

    if (method === "GET") {
      try {
        const rows = await db.select("modules", "order=display_order.asc");
        return json(200, rows.map(m => ({
          id: m.id, title: m.title, section: m.section, level: m.level,
          description: m.description, content: m.content, videoUrl: m.video_url,
          order: m.display_order
        })));
      } catch (e) { return json(500, { error: e.message }); }
    }

    if (method === "POST") {
      try {
        const inserted = await db.insert("modules", {
          title: body.title || "Sans titre",
          section: body.section || "general",
          level: body.level || "A1",
          description: body.description || "",
          content: body.content || "",
          video_url: body.videoUrl || "",
          display_order: body.order || 99,
        });
        const m = inserted[0];
        return json(201, { id: m.id, title: m.title, section: m.section, level: m.level,
          description: m.description, content: m.content, videoUrl: m.video_url, order: m.display_order });
      } catch (e) { return json(500, { error: e.message }); }
    }

    if (method === "PUT") {
      const id = path.split("/").pop();
      try {
        await db.update("modules", { id }, {
          title: body.title, section: body.section, level: body.level,
          description: body.description, content: body.content,
          video_url: body.videoUrl, display_order: body.order,
        });
        return json(200, { message: "Module mis à jour" });
      } catch (e) { return json(500, { error: e.message }); }
    }

    if (method === "DELETE") {
      const id = path.split("/").pop();
      try {
        await db.delete("modules", { id });
        return json(200, { message: "Module supprimé" });
      } catch (e) { return json(500, { error: e.message }); }
    }
  }

  // ── Student: get modules ────────────────────────────────────────────────────
  if (path === "/student/modules" && method === "GET") {
    const tok = verifyToken(getToken(event), SECRET);
    if (!tok || tok.role !== "student") return json(401, { error: "Non autorisé" });

    try {
      const rows = await db.select("students", `email=eq.${encodeURIComponent(tok.email)}`);
      const student = rows[0];
      if (!student) return json(404, { error: "Apprenant introuvable" });
      if (Date.now() > new Date(student.end_date).getTime()) return json(403, { error: "Accès expiré" });

      let query = student.section === "both" ? "order=display_order.asc" : `section=eq.${student.section}&order=display_order.asc`;
      const modules = await db.select("modules", query);

      return json(200, {
        modules: modules.map(m => ({
          id: m.id, title: m.title, section: m.section, level: m.level,
          description: m.description, content: m.content, videoUrl: m.video_url,
          order: m.display_order
        })),
        student: { name: student.name, section: student.section, endDate: student.end_date }
      });
    } catch (e) { return json(500, { error: e.message }); }
  }

  return json(404, { error: "Route introuvable" });
};
