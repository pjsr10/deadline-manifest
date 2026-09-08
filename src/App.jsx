import { useState, useEffect } from "react";
import { Plus, Trash2, LogOut } from "lucide-react";
import { supabase } from "./supabaseClient";

// --- Small pure helper functions ---------------------------------------

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  return Math.round((target - today) / 86400000);
}

function urgency(days) {
  if (days < 0) return { className: "red", label: `${Math.abs(days)}d overdue` };
  if (days === 0) return { className: "amber", label: "due today" };
  if (days <= 3) return { className: "amber", label: `${days}d left` };
  return { className: "teal", label: `${days}d left` };
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// --- Sign-in screen ------------------------------------------------------
// Real auth via Supabase magic links: no password to manage, the person
// just clicks the link that gets emailed to them.

function AuthScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignIn() {
    if (!email.trim()) {
      setError("Enter your email first.");
      return;
    }
    setLoading(true);
    setError("");
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
    });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="page">
      <div className="container">
        <div className="header">
          <p className="eyebrow">sign in</p>
          <h1 className="title">Manifest</h1>
          <p className="subtitle">Your own deadline list, from any device.</p>
        </div>

        <div className="auth-card">
          {sent ? (
            <p className="info-text" style={{ marginBottom: 0 }}>
              Check {email} for a sign-in link.
            </p>
          ) : (
            <>
              <p>Enter your email — we'll send a link, no password needed.</p>
              {error && <p className="error-text">{error}</p>}
              <div className="auth-form">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSignIn();
                  }}
                  placeholder="you@example.com"
                  className="input"
                />
                <button
                  onClick={handleSignIn}
                  disabled={loading}
                  className="button-primary"
                >
                  {loading ? "Sending…" : "Send magic link"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Main app, shown once someone is signed in ---------------------------

function Manifest({ user }) {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error: fetchError } = await supabase
        .from("items")
        .select("*")
        .eq("user_id", user.id)
        .order("deadline", { ascending: true });
      if (!mounted) return;
      if (fetchError) setError(fetchError.message);
      else setItems(data);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [user.id]);

  async function handleAdd() {
    if (!name.trim() || !deadline) {
      setFormError("Add a name and pick a date before submitting.");
      return;
    }
    setFormError("");
    const { data, error: insertError } = await supabase
      .from("items")
      .insert({ user_id: user.id, name: name.trim(), deadline })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      return;
    }
    setError("");
    // Re-sort locally rather than re-fetching everything from the server.
    const next = [...items, data].sort((a, b) => a.deadline.localeCompare(b.deadline));
    setItems(next);
    setName("");
    setDeadline("");
  }

  async function handleDelete(id) {
    const { error: deleteError } = await supabase.from("items").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setItems(items.filter((i) => i.id !== id));
  }

  return (
    <div className="page">
      <div className="container">
        <div className="header">
          <div className="top-bar">
            <p className="eyebrow" style={{ margin: 0 }}>
              {loading ? "loading" : `${items.length} tracked`}
            </p>
            <button
              onClick={() => supabase.auth.signOut()}
              className="button-ghost"
              style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
            >
              <LogOut size={12} /> {user.email}
            </button>
          </div>
          <h1 className="title">Manifest</h1>
          <p className="subtitle">Sorted by whatever's due soonest.</p>
        </div>

        <div className="form-row">
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (formError) setFormError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            placeholder="Name"
            className="input"
          />
          <input
            type="date"
            value={deadline}
            onChange={(e) => {
              setDeadline(e.target.value);
              if (formError) setFormError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            className="input"
          />
          <button onClick={handleAdd} className="button-primary">
            <Plus size={16} /> Add
          </button>
        </div>

        {formError && <p className="warning-text">{formError}</p>}
        {error && <p className="error-text">{error}</p>}

        {!loading && items.length === 0 && (
          <div className="empty-state">
            Nothing on the manifest yet. Add a name and a date above.
          </div>
        )}

        <div className="list">
          {items.map((item) => {
            const days = daysUntil(item.deadline);
            const u = urgency(days);
            return (
              <div key={item.id} className="item-row">
                <div className="item-days" style={{ color: `var(--${u.className})` }}>
                  {days < 0 ? `+${Math.abs(days)}d` : `${days}d`}
                </div>
                <div className="item-divider" />
                <div className="item-details">
                  <p className="item-name">{item.name}</p>
                  <p className="item-meta">
                    {formatDate(item.deadline)} · {u.label}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="delete-btn"
                  aria-label={`Remove ${item.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- Top-level component: decides whether to show sign-in or the app ----

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = still checking

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return null; // brief flash while checking auth state
  if (!session) return <AuthScreen />;
  return <Manifest user={session.user} />;
}
