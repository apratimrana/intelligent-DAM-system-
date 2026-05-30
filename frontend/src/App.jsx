import { useEffect, useMemo, useState } from "react";
import { me } from "./api/auth";
import { AuthPage } from "./pages/AuthPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";

function readStoredSession() {
  const token = localStorage.getItem("access_token");
  const userRaw = localStorage.getItem("user");
  try {
    return { token, user: userRaw ? JSON.parse(userRaw) : null };
  } catch {
    return { token, user: null };
  }
}

export function App() {
  const [session, setSession] = useState(() => readStoredSession());
  const [loading, setLoading] = useState(Boolean(session.token && !session.user));

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!session.token) return;
      if (session.user) return;
      try {
        const u = await me();
        if (cancelled) return;
        localStorage.setItem("user", JSON.stringify(u));
        setSession((s) => ({ ...s, user: u }));
      } catch {
        if (cancelled) return;
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        setSession({ token: null, user: null });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [session.token, session.user]);

  const api = useMemo(() => {
    return {
      setSessionFromAuth(data) {
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setSession({ token: data.access_token, user: data.user });
      },
      logout() {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        setSession({ token: null, user: null });
      },
    };
  }, []);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-slate-400">
              Digital Asset Management System
            </div>
            <div className="text-2xl font-semibold">DAM System</div>
          </div>
          {session.user ? (
            <div className="text-sm text-slate-300">
              <span className="text-slate-500">Signed in as</span>{" "}
              <span className="font-medium">{session.user.email}</span>{" "}
              <span className="text-slate-500">({session.user.role})</span>
            </div>
          ) : null}
        </header>

        {loading ? (
          <div className="text-slate-400">Loading session…</div>
        ) : session.token ? (
          <DashboardPage user={session.user} onLogout={api.logout} />
        ) : (
          <AuthPage onAuthed={api.setSessionFromAuth} />
        )}
      </div>
    </div>
  );
}


