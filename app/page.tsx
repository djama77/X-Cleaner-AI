"use client";

import { useEffect, useMemo, useState } from "react";

type XPost = { id: string; text: string; created_at: string; author_id: string };
type XUser = { id: string; name: string; username: string; profile_image_url?: string };

export default function Home() {
  const [user, setUser] = useState<XUser | null>(null);
  const [posts, setPosts] = useState<XPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("Connectez votre compte X pour afficher vos publications.");
  const cutoff = "2023-01-01T00:00:00.000Z";
  const oldPosts = useMemo(() => posts.filter(p => p.created_at && new Date(p.created_at).getTime() < Date.parse(cutoff)), [posts]);
  const dateLabel = (value: string) => new Date(value).toLocaleString("fr-FR");

  async function checkSession() {
    try {
      const response = await fetch("/api/x/session", { cache: "no-store" });
      const data = await response.json();
      if (data.connected && data.user) { setUser(data.user); setMessage("Compte X connecté. Chargez vos publications."); }
    } catch { setMessage("Impossible de vérifier la connexion X."); }
    finally { /* session check completed */ }
  }
  useEffect(() => { void checkSession(); }, []);

  async function loadPosts() {
    setLoading(true); setMessage("Lecture des publications depuis X…");
    try {
      const response = await fetch("/api/x/posts", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Lecture X impossible.");
      setUser(data.user); setPosts(data.posts || []);
      setMessage((data.posts || []).length + " publications récupérées. " + (data.limited ? "Limite de consultation atteinte (3 200 publications maximum dans cette session)." : "La consultation est terminée."));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Erreur de lecture."); }
    finally { setLoading(false); }
  }

  async function deleteOldPosts() {
    if (!oldPosts.length || deleting) return;
    const accepted = window.confirm("ATTENTION : vous allez demander la suppression définitive de " + oldPosts.length + " publications datées d'avant le 1er janvier 2023. Cette action ne peut pas être annulée. Les publications plus récentes seront ignorées. Continuer ?");
    if (!accepted) return;
    setDeleting(true);
    let deleted = 0; let failed = 0;
    try {
      for (let i = 0; i < oldPosts.length; i += 10) {
        const batch = oldPosts.slice(i, i + 10);
        const response = await fetch("/api/x/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: "DELETE_OLD_X_POSTS_BEFORE_2023", ids: batch.map(p => p.id) }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Suppression interrompue.");
        for (const result of data.results || []) result.deleted ? deleted++ : failed++;
        setPosts(current => current.filter(p => !(data.results || []).some((r: { id: string; deleted: boolean }) => r.id === p.id && r.deleted)));
        setMessage("Traitement automatique : " + deleted + " supprimée(s), " + failed + " échec(s).");
      }
      setMessage("Terminé : " + deleted + " publication(s) supprimée(s), " + failed + " échec(s). Les publications non supprimées sont conservées.");
    } catch (error) { setMessage((error instanceof Error ? error.message : "Erreur") + " Résultat partiel : " + deleted + " supprimée(s), " + failed + " échec(s)."); }
    finally { setDeleting(false); }
  }

  async function disconnect() {
    await fetch("/api/x/session", { method: "DELETE" });
    setUser(null); setPosts([]); setMessage("Compte X déconnecté de cette application.");
  }

  return <main className="shell">
    <header className="top"><div className="mark">X</div><div><p className="eyebrow">NETTOYAGE SÉCURISÉ DU COMPTE</p><h1>X-Cleaner-AI</h1><p className="sub">Retrouvez et supprimez les publications anciennes de votre propre compte X.</p></div></header>
    <section className="panel import">
      <h2>1. Connecter votre compte X</h2>
      <p>La connexion passe par la page officielle de X. Votre mot de passe X n'est jamais demandé ni enregistré par cette application.</p>
      {!user ? <a className="upload" href="/api/x/connect">Se connecter avec X</a> : <div className="toolbar"><strong>@{user.username} · {user.name}</strong><button className="secondary" onClick={disconnect}>Déconnecter</button></div>}
      <p className="status" role="status">{message}</p>
      {user && <button onClick={loadPosts} disabled={loading || deleting}>{loading ? "Chargement…" : "2. Charger mes publications"}</button>}
    </section>
    {user && <section className="stats">
      <div className="stat"><span>Récupérées</span><strong>{posts.length.toLocaleString("fr-FR")}</strong></div>
      <div className="stat"><span>Avant 2023</span><strong>{oldPosts.length.toLocaleString("fr-FR")}</strong></div>
      <div className="stat"><span>À partir de 2023</span><strong>{(posts.length-oldPosts.length).toLocaleString("fr-FR")}</strong></div>
    </section>}
    {user && posts.length > 0 && <section className="panel">
      <h2>3. Suppression automatique des anciennes publications</h2>
      <p>La sélection comprend uniquement les publications datées d'avant le 1er janvier 2023. Le serveur vérifie à nouveau la date et l'identité du propriétaire auprès de X avant chaque suppression.</p>
      <button onClick={deleteOldPosts} disabled={!oldPosts.length || deleting}>{deleting ? "Suppression en cours…" : "Supprimer les " + oldPosts.length + " publications d'avant 2023"}</button>
      <div className="results">{oldPosts.slice(0, 50).map(post => <article className="post" key={post.id}><div className="post-meta"><span className="tag automated">{dateLabel(post.created_at)}</span><span>ID : {post.id}</span></div><p>{post.text || "(publication sans texte)"}</p></article>)}
        {oldPosts.length > 50 && <p className="status">Aperçu des 50 premières anciennes publications. Toutes les publications éligibles sont prises en compte par l'action.</p>}
      </div>
    </section>}
    <footer><strong>Limites et protection</strong><p>Une suppression est définitive. Une seule confirmation est demandée avant le traitement par lots de 10. Le serveur refuse toute publication du 1er janvier 2023 ou après, et vérifie qu'elle appartient au compte connecté. L'API de timeline ne fournit pas nécessairement tout l'historique ancien du compte : si des publications manquent, l'archive officielle X sera nécessaire pour compléter la liste. Les limites et conditions d'accès de l'API X s'appliquent.</p></footer>
  </main>;
}
