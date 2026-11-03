"use client";

import { ChangeEvent, useMemo, useState } from "react";
import JSZip from "jszip";

type Post = { id: string; text: string; date: string; source: string; category: "automated" | "personal" | "uncertain"; reason: string };
const phraseRules = [/automatically checked by/i, /automatically posted/i, /posted via/i, /via ifttt/i, /via dlvr\.it/i, /sent from my/i];
function parseTweets(raw: string): unknown[] {
  const start = raw.indexOf("[");
  if (start < 0) throw new Error("Fichier tweets.js non reconnu.");
  return JSON.parse(raw.slice(start).replace(/;\s*$/, ""));
}
function unwrap(value: unknown): Record<string, unknown> {
  const v = value as Record<string, unknown>;
  return (v?.tweet && typeof v.tweet === "object" ? v.tweet : v) as Record<string, unknown>;
}
function csvCell(value: string) { return '"' + value.replace(/"/g, '""') + '"'; }

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Importez votre archive X au format ZIP pour commencer.");
  const [filter, setFilter] = useState("all");
  const [aiBusy, setAiBusy] = useState(false);
  const counts = useMemo(() => ({ all: posts.length, automated: posts.filter(p=>p.category==="automated").length, personal: posts.filter(p=>p.category==="personal").length, uncertain: posts.filter(p=>p.category==="uncertain").length }), [posts]);
  async function importArchive(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    setBusy(true); setMessage("Lecture de l'archive en cours…");
    try {
      const zip = await JSZip.loadAsync(file);
      const files = Object.values(zip.files).filter(f=>!f.dir && /(^|\/)tweets(?:\.part\d+)?\.js$/i.test(f.name));
      if (!files.length) throw new Error("Aucun fichier tweets.js trouvé. Vérifiez que vous avez choisi l'archive X officielle.");
      const all: Post[] = [];
      for (const entry of files) {
        const raw = await entry.async("string");
        for (const item of parseTweets(raw)) {
          const t = unwrap(item); const text = String(t.full_text ?? t.text ?? "");
          const source = String(t.source ?? "").replace(/<[^>]*>/g, "").trim();
          const automated = phraseRules.some(rule=>rule.test(text)) || /ifttt|dlvr\.it|buffer|socialdog|flwrs/i.test(source);
          all.push({ id:String(t.id_str ?? t.id ?? all.length), text, date:String(t.created_at ?? ""), source, category:automated?"automated":"uncertain", reason:automated?"Indice explicite de service tiers":"À vérifier" });
        }
      }
      setPosts(all); setMessage(`${all.length.toLocaleString("fr-FR")} publications importées. Les indices automatiques sont préclassés; le reste reste à vérifier.`);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Erreur pendant l'import."); }
    finally { setBusy(false); event.target.value = ""; }
  }
  async function classifyWithAI() {
    const pending = posts.filter(p=>p.category==="uncertain");
    if (!pending.length) { setMessage("Aucune publication incertaine à analyser."); return; }
    setAiBusy(true); let updated = [...posts]; let completed = 0;
    try {
      for (let i=0;i<pending.length;i+=20) {
        const batch = pending.slice(i,i+20);
        const response = await fetch("/api/classify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({items:batch.map(p=>({id:p.id,text:p.text,source:p.source}))})});
        const data = await response.json(); if (!response.ok) throw new Error(data.error || "Erreur Groq.");
        const byId = new Map((data.results || []).map((r: {id:string;category:Post["category"];reason:string})=>[r.id,r]));
        updated = updated.map(p=>{ const r=byId.get(p.id) as {category:Post["category"];reason:string}|undefined; return r?{...p,category:r.category,reason:r.reason}:p; });
        completed += batch.length; setMessage(`Analyse Groq : ${completed} / ${pending.length} publications traitées.`);
      }
      setPosts(updated); setMessage("Analyse terminée. Vérifiez les résultats avant toute décision.");
    } catch(e) { setMessage(e instanceof Error?e.message:"Erreur Groq."); }
    finally { setAiBusy(false); }
  }
  function exportCsv() {
    const rows=[["id","date","source","category","reason","text"],...posts.map(p=>[p.id,p.date,p.source,p.category,p.reason,p.text])];
    const blob=new Blob(["\uFEFF"+rows.map(r=>r.map(csvCell).join(",")).join("\n")],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="x-cleaner-analysis.csv"; a.click(); URL.revokeObjectURL(url);
  }
  const visible = posts.filter(p=>filter==="all"||p.category===filter);
  return <main className="shell">
    <header className="top"><div className="mark">X</div><div><p className="eyebrow">ANALYSE PRIVÉE DE VOTRE ARCHIVE</p><h1>X-Cleaner-AI</h1><p className="sub">Repérez les publications automatisées. Préservez vos tweets personnels.</p></div></header>
    <section className="panel import"><h2>1. Importer votre archive X</h2><p>Choisissez le fichier ZIP téléchargé depuis les paramètres de votre compte X. L'analyse initiale se fait dans votre navigateur.</p><label className="upload"> {busy?"Lecture…":"Choisir une archive ZIP"} <input type="file" accept=".zip,application/zip" onChange={importArchive} disabled={busy}/></label><p className="status" role="status">{message}</p></section>
    <section className="stats">
      <div className="stat"><span>Total</span><strong>{counts.all.toLocaleString("fr-FR")}</strong></div>
      <div className="stat"><span>Automatisées</span><strong>{counts.automated.toLocaleString("fr-FR")}</strong></div>
      <div className="stat"><span>Personnelles</span><strong>{counts.personal.toLocaleString("fr-FR")}</strong></div>
      <div className="stat"><span>À vérifier</span><strong>{counts.uncertain.toLocaleString("fr-FR")}</strong></div>
    </section>
    <section className="panel"><div className="section-head"><div><h2>2. Examiner les résultats</h2><p>Les publications incertaines peuvent être examinées par Groq si la clé API est configurée.</p></div><button onClick={classifyWithAI} disabled={!posts.length||aiBusy}>{aiBusy?"Analyse…":"Analyser avec Groq"}</button></div>
      <div className="toolbar"><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Toutes les catégories</option><option value="automated">Automatisées</option><option value="personal">Personnelles</option><option value="uncertain">À vérifier</option></select><button className="secondary" onClick={exportCsv} disabled={!posts.length}>Exporter CSV</button></div>
      <div className="results">{visible.slice(0,100).map((p,i)=><article className="post" key={p.id+"-"+i}><div className="post-meta"><span className={"tag "+p.category}>{p.category==="automated"?"Automatisée":p.category==="personal"?"Personnelle":"À vérifier"}</span><span>{p.date}</span></div><p>{p.text||"(publication sans texte)"}</p><small>{p.source} {p.reason&&"· "+p.reason}</small></article>)}{visible.length>100&&<p className="status">Affichage des 100 premières publications de cette catégorie. L'export CSV contient tous les résultats.</p>}{posts.length===0&&<p className="empty">Aucune publication importée pour le moment.</p>}</div>
    </section>
    <footer><strong>Confidentialité et sécurité</strong><p>Aucune publication n'est supprimée. Conservez une copie intacte de votre archive. La clé Groq doit être ajoutée uniquement dans les variables d'environnement Vercel, jamais dans GitHub. Les résultats doivent être vérifiés manuellement.</p></footer>
  </main>;
}
