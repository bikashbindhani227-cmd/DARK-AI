"use client";

import { useEffect, useState } from "react";

type AdminUser = {
  uid: string;
  email: string;
  displayName: string;
  premium: boolean;
  premiumUntil: number | null;
  accountType: string;
  lastSeenAt: number | null;
};

type Stats = {
  users: number;
  premiumUsers: number;
  chats: number;
  searchProvider: string;
  aiProvider: string;
  model: string | null;
  firebaseEnabled: boolean;
  telegramPremiumContact: string;
};

const formatDate = (value: number | null) =>
  value ? new Date(value).toLocaleString() : "—";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [workingUid, setWorkingUid] = useState<string | null>(null);

  useEffect(() => setToken(sessionStorage.getItem("dark-ai-admin-token")), []);

  const loadData = async (authToken: string, search = query) => {
    const headers = { Authorization: `Bearer ${authToken}` };
    const [statsResponse, usersResponse] = await Promise.all([
      fetch("/api/admin/stats", { headers, cache: "no-store" }),
      fetch(`/api/admin/users?q=${encodeURIComponent(search)}`, { headers, cache: "no-store" }),
    ]);
    const statsData = await statsResponse.json();
    const usersData = await usersResponse.json();
    if (!statsResponse.ok) throw new Error(statsData.error || "Unable to load admin data");
    if (!usersResponse.ok) throw new Error(usersData.error || "Unable to load users");
    setStats(statsData);
    setUsers(usersData.users || []);
  };

  const login = async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login failed");
      sessionStorage.setItem("dark-ai-admin-token", data.token);
      setToken(data.token);
      await loadData(data.token, "");
    } catch (e) { setError(e instanceof Error ? e.message : "Login failed"); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (token) loadData(token).catch((e) => setError(e.message)); }, [token]);

  const changePremium = async (uid: string, action: "grant" | "extend" | "remove", days = 30) => {
    if (!token) return;
    setWorkingUid(uid); setError("");
    try {
      const response = await fetch("/api/admin/premium", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ uid, action, days }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Premium update failed");
      await loadData(token);
    } catch (e) { setError(e instanceof Error ? e.message : "Premium update failed"); }
    finally { setWorkingUid(null); }
  };

  if (!token) return (
    <main className="min-h-dvh bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-5 rounded-2xl border bg-card p-6">
        <h1 className="text-2xl font-semibold">DARK AI Admin</h1>
        <p className="text-sm text-muted-foreground">Private admin panel: /admin</p>
        <input className="w-full rounded-xl border bg-background px-4 py-3" type="password" placeholder="Admin password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button className="w-full rounded-xl border px-4 py-3" onClick={login} disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
      </div>
    </main>
  );

  return (
    <main className="min-h-dvh bg-background text-foreground p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div><h1 className="text-3xl font-semibold">DARK AI Admin</h1><p className="text-sm text-muted-foreground">Manual Premium control · Telegram {stats?.telegramPremiumContact || "@MrNewton_2"}</p></div>
          <button className="rounded-xl border px-4 py-2" onClick={() => { sessionStorage.removeItem("dark-ai-admin-token"); setToken(null); }}>Logout</button>
        </div>
        {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border p-5"><div className="text-sm text-muted-foreground">Users</div><div className="mt-2 text-3xl font-semibold">{stats?.users ?? 0}</div></div>
          <div className="rounded-2xl border p-5"><div className="text-sm text-muted-foreground">Premium</div><div className="mt-2 text-3xl font-semibold">{stats?.premiumUsers ?? 0}</div></div>
          <div className="rounded-2xl border p-5"><div className="text-sm text-muted-foreground">Chats</div><div className="mt-2 text-3xl font-semibold">{stats?.chats ?? 0}</div></div>
          <div className="rounded-2xl border p-5"><div className="text-sm text-muted-foreground">AI provider</div><div className="mt-2 text-xl font-semibold">{stats?.aiProvider ?? "—"}</div></div>
        </div>
        <section className="space-y-3 rounded-2xl border p-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input className="w-full rounded-xl border bg-background px-4 py-3" placeholder="Search email, name, or UID" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && token && loadData(token, query)} />
            <button className="rounded-xl border px-5 py-3" onClick={() => token && loadData(token, query)}>Search</button>
          </div>
          <p className="text-sm text-muted-foreground">User pays/messages <strong>{stats?.telegramPremiumContact || "@MrNewton_2"}</strong>. You verify manually, then click Give/Extend here.</p>
        </section>
        <section className="overflow-hidden rounded-2xl border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-sm">
              <thead className="border-b bg-muted/30"><tr className="text-left"><th className="p-4">User</th><th className="p-4">UID</th><th className="p-4">Plan</th><th className="p-4">Expiry</th><th className="p-4">Actions</th></tr></thead>
              <tbody>{users.map((user) => <tr key={user.uid} className="border-b last:border-0">
                <td className="p-4"><div className="font-medium">{user.displayName || "Unnamed"}</div><div className="text-muted-foreground">{user.email || "No email"}</div></td>
                <td className="p-4 font-mono text-xs">{user.uid}</td>
                <td className="p-4">{user.premium ? "PREMIUM" : "FREE"}</td>
                <td className="p-4">{user.premiumUntil == null && user.premium ? "Lifetime" : formatDate(user.premiumUntil)}</td>
                <td className="p-4"><div className="flex flex-wrap gap-2">
                  <button className="rounded-lg border px-3 py-2" disabled={workingUid === user.uid} onClick={() => changePremium(user.uid, "grant", 30)}>Give 30d</button>
                  <button className="rounded-lg border px-3 py-2" disabled={workingUid === user.uid} onClick={() => changePremium(user.uid, "extend", 30)}>+30d</button>
                  <button className="rounded-lg border px-3 py-2 text-red-500" disabled={workingUid === user.uid || !user.premium} onClick={() => changePremium(user.uid, "remove")}>Remove</button>
                </div></td>
              </tr>)}</tbody>
            </table>
          </div>
          {!users.length && <div className="p-8 text-center text-muted-foreground">No users found. A user appears here after signing in and syncing with Firebase.</div>}
        </section>
      </div>
    </main>
  );
}
