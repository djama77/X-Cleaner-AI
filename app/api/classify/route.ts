import { NextResponse } from "next/server";
export const runtime = "nodejs";
type Item = { id: string; text: string; source?: string };
export async function POST(request: Request) {
  if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: "GROQ_API_KEY n'est pas configurée. L'analyse locale reste disponible." }, { status: 503 });
  let items: Item[];
  try {
    const body = await request.json();
    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 20) return NextResponse.json({ error: "Envoyez un lot de 1 à 20 publications." }, { status: 400 });
    items = body.items.map((v: unknown) => { const x = v as Record<string, unknown>; if (typeof x.id !== "string" || typeof x.text !== "string") throw new Error("Publication invalide."); return { id: x.id.slice(0,100), text: x.text.slice(0,4000), source: typeof x.source === "string" ? x.source.slice(0,500) : "" }; });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Requête invalide." }, { status: 400 }); }
  const prompt = `Classe chaque publication: automated seulement avec indices explicites d'un service ou robot; personal si elle semble écrite par une personne; uncertain en cas de doute. Ne considère pas un texte court ou répétitif comme automatiquement automatisé. Réponds uniquement en JSON: {"results":[{"id":"...","category":"automated|personal|uncertain","reason":"raison brève"}]}. Données: ${JSON.stringify(items)}`;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", { method:"POST", headers:{ Authorization:`Bearer ${process.env.GROQ_API_KEY}`, "Content-Type":"application/json" }, body:JSON.stringify({ model:process.env.GROQ_MODEL || "llama-3.3-70b-versatile", temperature:0, response_format:{type:"json_object"}, messages:[{role:"user",content:prompt}] }) });
    if (!res.ok) return NextResponse.json({ error:"Groq n'a pas pu traiter ce lot. Réessayez plus tard." }, { status:502 });
    const data = await res.json(); const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}"); const ids = new Set(items.map(x=>x.id));
    const results = Array.isArray(parsed.results) ? parsed.results.filter((x: {id?:string})=>ids.has(x.id || "")).map((x: {id:string;category:string;reason?:string})=>({id:x.id,category:["automated","personal","uncertain"].includes(x.category)?x.category:"uncertain",reason:String(x.reason||"").slice(0,240)})) : [];
    return NextResponse.json({results});
  } catch { return NextResponse.json({error:"Erreur de communication avec Groq."},{status:502}); }
}
