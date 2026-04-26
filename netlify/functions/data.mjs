import { getStore } from "@netlify/blobs";
import defaults from "../../package.json" with { type: "json" };

const STORE = "site-content";
const KEY = "site";

export default async (req) => {
  const store = getStore(STORE);

  if (req.method === "GET") {
    const saved = await store.get(KEY, { type: "json" });
    return Response.json(saved || defaults);
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Geçersiz JSON" }, { status: 400 });
    }
    await store.setJSON(KEY, body);
    return Response.json({ ok: true });
  }

  return new Response("Method Not Allowed", { status: 405 });
};

export const config = {
  path: "/api/data",
};
