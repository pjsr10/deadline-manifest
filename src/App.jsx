import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Check,
  RotateCcw,
  Archive,
  Pencil,
  LogOut,
} from "lucide-react";
import { supabase } from "./supabaseClient";

// --- Constants and style tokens -------------------------------------------

const TRASH_DAYS = 30;

// These point at the CSS variables already defined in index.css.
const c = {
  panel: "var(--panel)",
  panelAlt: "#141821",
  border: "var(--border)",
  text: "var(--text)",
  muted: "var(--muted)",
  teal: "var(--teal)",
  amber: "var(--amber)",
  red: "var(--red)",
  bg: "var(--bg)",
};
const mono = "var(--font-mono)";

const iconBtn = {
  background: "none",
  border: "none",
  color: c.muted,
  cursor: "pointer",
  opacity: 0.6,
  padding: "0.25rem",
  display: "flex",
};
const smallField = {
  background: c.panelAlt,
  border: `1px solid ${c.border}`,
  color: c.text,
  borderRadius: "0.25rem",
  padding: "0.25rem 0.5rem",
  fontSize: "0.75rem",
  fontFamily: "inherit",
  outline: "none",
  colorScheme: "dark",
};
const restoreBtn = {
  background: "none",
  border: `1px solid ${c.border}`,
  borderRadius: 6,
  padding: "4px 8px",
  color: c.teal,
  cursor: "pointer",
  fontSize: "0.75rem",
  display: "flex",
  alignItems: "center",
  gap: 4,
  fontFamily: "inherit",
};

// --- Small pure helper functions -------------------------------------------

const nowISO = () => new Date().toISOString();

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  return Math.round((target - today) / 86400000);
}

function urgency(days) {
  if (days < 0) return { color: c.red, label: `${Math.abs(days)}d overdue` };
  if (days === 0) return { color: c.amber, label: "due today" };
  if (days <= 3) return { color: c.amber, label: `${days}d left` };
  return { color: c.teal, label: `${days}d left` };
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

const daysSince = (iso) => Math.floor((new Date() - new Date(iso)) / 86400000);
const fmtDays = (d) => (d < 0 ? `+${Math.abs(d)}d` : `${d}d`);

// The two dates shown on a collapsed row, soonest first: the main deadline
// and the soonest active (not completed, not deleted) sub-deadline, if any.
function effectiveInfo(item) {
  const main = { date: item.deadline, label: "Main deadline" };
  let sub = null;
  for (const s of item.sub_deadlines) {
    if (s.deleted_at || s.completed_at) continue;
    if (!sub || s.deadline < sub.date) sub = { date: s.deadline, label: s.name };
  }
  if (!sub) return { first: main, second: null };
  return sub.date <= main.date ? { first: sub, second: main } : { first: main, second: sub };
}

// --- Inline editor, used for both main items and sub-deadlines ------------
// Enter saves, Escape cancels.

function EditRow({ draft, setDraft, onSave, onCancel, error, warning, multiline }) {
  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSave();
    }
    if (e.key === "Escape") onCancel();
  };
  const Tag = multiline ? "textarea" : "input";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "0.5rem" }}>
      <Tag
        autoFocus
        value={draft.name}
        rows={multiline ? 3 : undefined}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        onKeyDown={onKey}
        style={{ ...smallField, width: "100%", resize: "vertical" }}
      />
      <div style={{ display: "flex", gap: "0.25rem" }}>
        <input
          type="date"
          value={draft.date}
          onChange={(e) => setDraft({ ...draft, date: e.target.value })}
          onKeyDown={onKey}
          style={{ ...smallField, flex: 1 }}
        />
        <button
          onClick={onSave}
          style={{ background: c.teal, color: c.bg, border: "none", borderRadius: "0.25rem", padding: "0 0.75rem", fontSize: "0.75rem", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
        >
          Save
        </button>
        <button
          onClick={onCancel}
          style={{ background: "none", border: `1px solid ${c.border}`, color: c.muted, borderRadius: "0.25rem", padding: "0 0.75rem", fontSize: "0.75rem", cursor: "pointer", fontFamily: "inherit" }}
        >
          Cancel
        </button>
      </div>
      {error && <p style={{ fontSize: "0.75rem", color: c.red, margin: 0 }}>{error}</p>}
      {warning && <p style={{ fontSize: "0.75rem", color: c.amber, margin: 0 }}>{warning}</p>}
    </div>
  );
}

// --- Sign-in screen --------------------------------------------------------
// Real auth via Supabase magic links: no password to manage.

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
      options: {
        // Send people back to the full app address, including the repo path.
        emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
      },
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
                <button onClick={handleSignIn} disabled={loading} className="button-primary">
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

// --- Main app, shown once someone is signed in ----------------------------

function Manifest({ user }) {
  const [items, setItems] = useState([]); // each item carries its sub_deadlines array
  const [view, setView] = useState("list"); // "list" | "trash"
  const [expanded, setExpanded] = useState({});
  const [name, setName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [subDrafts, setSubDrafts] = useState({});
  const [editing, setEditing] = useState(null); // { kind, itemId, subId }
  const [editDraft, setEditDraft] = useState({ name: "", date: "" });
  const [editError, setEditError] = useState("");
  const [highlightId, setHighlightId] = useState(null);

  // Load everything once. First clear out anything that has sat in the
  // trash for more than 30 days (row-level security limits this to the
  // signed-in person's own rows), then fetch items with their sub-deadlines.
  useEffect(() => {
    let mounted = true;
    (async () => {
      const cutoff = new Date(Date.now() - TRASH_DAYS * 86400000).toISOString();
      await supabase.from("sub_deadlines").delete().lt("deleted_at", cutoff);
      await supabase.from("items").delete().lt("deleted_at", cutoff);

      const { data, error: fetchError } = await supabase
        .from("items")
        .select("*, sub_deadlines(*)")
        .eq("user_id", user.id);
      if (!mounted) return;
      if (fetchError) setError(fetchError.message);
      else setItems(data);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [user.id]);

  // --- Local state helpers --------------------------------------------------

  const patchItem = (id, fn) =>
    setItems((list) => list.map((it) => (it.id === id ? fn(it) : it)));

  const patchSub = (itemId, subId, patch) =>
    patchItem(itemId, (it) => ({
      ...it,
      sub_deadlines: it.sub_deadlines.map((s) => (s.id === subId ? { ...s, ...patch } : s)),
    }));

  // --- Database actions: each one talks to Supabase, then updates the screen

  async function updateItemRow(id, patch) {
    const { error: e } = await supabase.from("items").update(patch).eq("id", id);
    if (e) {
      setError(e.message);
      return false;
    }
    setError("");
    patchItem(id, (it) => ({ ...it, ...patch }));
    return true;
  }

  async function updateSubRow(itemId, subId, patch) {
    const { error: e } = await supabase.from("sub_deadlines").update(patch).eq("id", subId);
    if (e) {
      setError(e.message);
      return false;
    }
    setError("");
    patchSub(itemId, subId, patch);
    return true;
  }

  async function addItem() {
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
    setItems((list) => [...list, { ...data, sub_deadlines: [] }]);
    setName("");
    setDeadline("");
  }

  const deleteItem = (id) => updateItemRow(id, { deleted_at: nowISO() });
  const restoreItem = (id) => updateItemRow(id, { deleted_at: null });

  async function permanentlyDeleteItem(id) {
    const { error: e } = await supabase.from("items").delete().eq("id", id);
    if (e) {
      setError(e.message);
      return;
    }
    setItems((list) => list.filter((it) => it.id !== id));
  }

  const setSubDraft = (itemId, field, value) =>
    setSubDrafts((d) => ({ ...d, [itemId]: { ...d[itemId], [field]: value } }));

  async function addSub(itemId) {
    const draft = subDrafts[itemId] || {};
    if (!draft.name?.trim() || !draft.date) return;
    const { data, error: insertError } = await supabase
      .from("sub_deadlines")
      .insert({ item_id: itemId, user_id: user.id, name: draft.name.trim(), deadline: draft.date })
      .select()
      .single();
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setError("");
    patchItem(itemId, (it) => ({ ...it, sub_deadlines: [...it.sub_deadlines, data] }));
    setSubDrafts((d) => ({ ...d, [itemId]: { name: "", date: "" } }));
  }

  const toggleCompleteSub = (itemId, sub) =>
    updateSubRow(itemId, sub.id, { completed_at: sub.completed_at ? null : nowISO() });
  const deleteSub = (itemId, subId) => updateSubRow(itemId, subId, { deleted_at: nowISO() });
  const restoreSub = (itemId, subId) => updateSubRow(itemId, subId, { deleted_at: null });

  async function permanentlyDeleteSub(itemId, subId) {
    const { error: e } = await supabase.from("sub_deadlines").delete().eq("id", subId);
    if (e) {
      setError(e.message);
      return;
    }
    patchItem(itemId, (it) => ({
      ...it,
      sub_deadlines: it.sub_deadlines.filter((s) => s.id !== subId),
    }));
  }

  // --- Editing ----------------------------------------------------------------

  function startEdit(kind, itemId, subId, nameValue, dateValue) {
    setEditing({ kind, itemId, subId });
    setEditDraft({ name: nameValue, date: dateValue });
    setEditError("");
  }

  function cancelEdit() {
    setEditing(null);
    setEditError("");
  }

  async function saveEdit() {
    if (!editing) return;
    const n = editDraft.name.trim();
    if (!n || !editDraft.date) {
      setEditError("Name and date are both required.");
      return;
    }
    const ok =
      editing.kind === "item"
        ? await updateItemRow(editing.itemId, { name: n, deadline: editDraft.date })
        : await updateSubRow(editing.itemId, editing.subId, { name: n, deadline: editDraft.date });
    if (!ok) return;
    const id = editing.itemId;
    setEditing(null);
    setEditError("");
    // The list re-sorts after an edit, so flash the row to show where it landed.
    setHighlightId(id);
    setTimeout(() => setHighlightId(null), 2000);
  }

  // --- Derived lists -----------------------------------------------------------

  const activeItems = items
    .filter((it) => !it.deleted_at)
    .map((it) => ({ ...it, _effective: effectiveInfo(it) }))
    .sort((a, b) => a._effective.first.date.localeCompare(b._effective.first.date));

  const trashedItems = items.filter((it) => it.deleted_at);
  const trashedSubs = items.flatMap((it) =>
    it.sub_deadlines
      .filter((s) => s.deleted_at)
      .map((s) => ({ ...s, parentId: it.id, parentName: it.name }))
  );
  const trashCount = trashedItems.length + trashedSubs.length;

  const tabStyle = (active) => ({
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: active ? c.teal : c.muted,
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
  });

  const card = { background: c.panel, border: `1px solid ${c.border}`, borderRadius: "0.5rem" };
  const emptyBox = {
    background: c.panel,
    border: `1px dashed ${c.border}`,
    borderRadius: "0.5rem",
    padding: "2rem",
    textAlign: "center",
    fontSize: "0.875rem",
    color: c.muted,
  };

  return (
    <div className="page">
      <div className="container">
        <div className="top-bar" style={{ alignItems: "center", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", gap: "1.25rem" }}>
            <button onClick={() => setView("list")} style={tabStyle(view === "list")}>
              Manifest
            </button>
            <button onClick={() => setView("trash")} style={tabStyle(view === "trash")}>
              <Archive size={14} /> Trash{trashCount > 0 ? ` (${trashCount})` : ""}
            </button>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="button-ghost"
            style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
          >
            <LogOut size={12} /> {user.email}
          </button>
        </div>

        {error && <p className="error-text">{error}</p>}

        {view === "list" ? (
          <>
            <div className="header" style={{ marginBottom: "1.5rem" }}>
              <h1 className="title">Manifest</h1>
              <p className="subtitle">
                {loading ? "Loading…" : "Sorted by whatever's due soonest — including sub-deadlines."}
              </p>
            </div>

            <div className="form-row" style={{ marginBottom: "0.5rem" }}>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (formError) setFormError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addItem();
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
                  if (e.key === "Enter") addItem();
                }}
                className="input"
              />
              <button onClick={addItem} className="button-primary">
                <Plus size={16} /> Add
              </button>
            </div>
            {formError && <p className="warning-text">{formError}</p>}
            <div style={{ height: "1rem" }} />

            {!loading && activeItems.length === 0 && (
              <div style={emptyBox}>Nothing on the manifest yet. Add a name and a date above.</div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {activeItems.map((item) => {
                const { first, second } = item._effective;
                const days = daysUntil(first.date);
                const u = urgency(days);
                const days2 = second ? daysUntil(second.date) : null;
                const isOpen = !!expanded[item.id];
                const editingItem = editing && editing.kind === "item" && editing.itemId === item.id;
                const activeSubs = item.sub_deadlines
                  .filter((s) => !s.deleted_at && !s.completed_at)
                  .sort((a, b) => a.deadline.localeCompare(b.deadline));
                const completedSubs = item.sub_deadlines.filter((s) => !s.deleted_at && s.completed_at);
                const draft = subDrafts[item.id] || { name: "", date: "" };

                return (
                  <div
                    key={item.id}
                    style={{
                      ...card,
                      border: `1px solid ${highlightId === item.id ? c.teal : c.border}`,
                      transition: "border-color 0.6s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem" }}>
                      <button
                        onClick={() => setExpanded((e) => ({ ...e, [item.id]: !e[item.id] }))}
                        aria-label={isOpen ? "Collapse" : "Expand"}
                        style={{ ...iconBtn, opacity: 1, padding: 0 }}
                      >
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>

                      <div style={{ width: "4.5rem", textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontFamily: mono, fontWeight: 700, fontSize: "1.1rem", color: u.color }}>
                          {fmtDays(days)}
                        </div>
                        {second && (
                          <div style={{ fontFamily: mono, fontWeight: 500, fontSize: "0.8rem", color: c.muted }}>
                            {fmtDays(days2)}
                          </div>
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.875rem",
                            fontWeight: 500,
                            whiteSpace: isOpen ? "normal" : "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            wordBreak: "break-word",
                          }}
                        >
                          {item.name}
                        </p>
                        {second ? (
                          <>
                            <p className="item-meta" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {first.label} · {formatDate(first.date)}
                            </p>
                            <p className="item-meta" style={{ opacity: 0.7, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {second.label} · {formatDate(second.date)}
                            </p>
                          </>
                        ) : (
                          <p className="item-meta">
                            {formatDate(first.date)} · {u.label}
                          </p>
                        )}
                      </div>

                      <button onClick={() => deleteItem(item.id)} aria-label={`Move ${item.name} to trash`} style={iconBtn}>
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {isOpen && (
                      <div style={{ padding: "0 1rem 1rem", borderTop: `1px solid ${c.border}` }}>
                        <div style={{ margin: "0.75rem 0" }}>
                          {editingItem ? (
                            <EditRow
                              multiline
                              draft={editDraft}
                              setDraft={setEditDraft}
                              onSave={saveEdit}
                              onCancel={cancelEdit}
                              error={editError}
                              warning={
                                activeSubs.some((s) => s.deadline > editDraft.date)
                                  ? "A sub-deadline falls after this date — check it?"
                                  : ""
                              }
                            />
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem", color: c.muted }}>
                              <span>
                                Main deadline · {formatDate(item.deadline)} · {urgency(daysUntil(item.deadline)).label}
                              </span>
                              <button
                                onClick={() => startEdit("item", item.id, null, item.name, item.deadline)}
                                aria-label="Edit main deadline"
                                style={iconBtn}
                              >
                                <Pencil size={13} />
                              </button>
                            </div>
                          )}
                        </div>

                        <p style={{ fontSize: "0.75rem", color: c.muted, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 0.5rem" }}>
                          Sub-deadlines
                        </p>

                        {activeSubs.length === 0 && completedSubs.length === 0 && (
                          <p style={{ fontSize: "0.75rem", color: c.muted, margin: "0 0 0.5rem" }}>None yet.</p>
                        )}

                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "0.5rem" }}>
                          {activeSubs.map((sub) => {
                            if (editing && editing.kind === "sub" && editing.subId === sub.id) {
                              return (
                                <EditRow
                                  key={sub.id}
                                  draft={editDraft}
                                  setDraft={setEditDraft}
                                  onSave={saveEdit}
                                  onCancel={cancelEdit}
                                  error={editError}
                                  warning={editDraft.date > item.deadline ? "Later than the main deadline — check the date?" : ""}
                                />
                              );
                            }
                            const sd = daysUntil(sub.deadline);
                            const su = urgency(sd);
                            return (
                              <div
                                key={sub.id}
                                style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.375rem 0.5rem", borderRadius: "0.25rem", background: c.panelAlt, fontSize: "0.75rem" }}
                              >
                                <button
                                  onClick={() => toggleCompleteSub(item.id, sub)}
                                  aria-label="Mark complete"
                                  style={{ background: "none", border: `1px solid ${c.border}`, borderRadius: "9999px", width: 16, height: 16, cursor: "pointer", flexShrink: 0, padding: 0 }}
                                />
                                <span style={{ color: su.color, fontFamily: mono, width: "2.5rem", flexShrink: 0 }}>{fmtDays(sd)}</span>
                                <span style={{ flex: 1, minWidth: 0, wordBreak: "break-word" }}>{sub.name}</span>
                                <button onClick={() => startEdit("sub", item.id, sub.id, sub.name, sub.deadline)} aria-label="Edit sub-deadline" style={iconBtn}>
                                  <Pencil size={13} />
                                </button>
                                <button onClick={() => deleteSub(item.id, sub.id)} aria-label="Move sub-deadline to trash" style={iconBtn}>
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            );
                          })}

                          {completedSubs.map((sub) => (
                            <div
                              key={sub.id}
                              style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.375rem 0.5rem", borderRadius: "0.25rem", background: c.panelAlt, fontSize: "0.75rem", opacity: 0.5 }}
                            >
                              <button
                                onClick={() => toggleCompleteSub(item.id, sub)}
                                aria-label="Undo complete"
                                style={{ background: c.teal, border: "none", borderRadius: "9999px", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, padding: 0 }}
                              >
                                <Check size={10} style={{ color: c.bg }} />
                              </button>
                              <span style={{ flex: 1, minWidth: 0, wordBreak: "break-word", textDecoration: "line-through" }}>{sub.name}</span>
                              <button onClick={() => deleteSub(item.id, sub.id)} aria-label="Move sub-deadline to trash" style={iconBtn}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div style={{ display: "flex", gap: "0.25rem" }}>
                          <input
                            type="text"
                            value={draft.name}
                            onChange={(e) => setSubDraft(item.id, "name", e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") addSub(item.id);
                            }}
                            placeholder="New sub-deadline"
                            style={{ ...smallField, flex: 1, minWidth: 0 }}
                          />
                          <input
                            type="date"
                            value={draft.date}
                            onChange={(e) => setSubDraft(item.id, "date", e.target.value)}
                            style={smallField}
                          />
                          <button
                            onClick={() => addSub(item.id)}
                            aria-label="Add sub-deadline"
                            style={{ background: c.teal, color: c.bg, border: "none", borderRadius: "0.25rem", padding: "0 0.5rem", cursor: "pointer", display: "flex", alignItems: "center" }}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        {draft.date && draft.date > item.deadline && (
                          <p style={{ fontSize: "0.75rem", color: c.amber, margin: "0.25rem 0 0" }}>
                            Later than the main deadline — check the date?
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="header" style={{ marginBottom: "1.5rem" }}>
              <h1 className="title">Trash</h1>
              <p className="subtitle">Kept for {TRASH_DAYS} days, then removed automatically.</p>
            </div>

            {trashCount === 0 && <div style={emptyBox}>Nothing in the trash.</div>}

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {trashedItems.map((item) => {
                const left = Math.max(0, TRASH_DAYS - daysSince(item.deleted_at));
                return (
                  <div key={item.id} style={{ ...card, display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="item-name">{item.name}</p>
                      <p className="item-meta">Item · {left}d until permanently removed</p>
                    </div>
                    <button onClick={() => restoreItem(item.id)} style={restoreBtn}>
                      <RotateCcw size={12} /> Restore
                    </button>
                    <button
                      onClick={() => permanentlyDeleteItem(item.id)}
                      aria-label="Delete forever"
                      style={{ ...iconBtn, color: c.red, opacity: 1 }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}

              {trashedSubs.map((sub) => {
                const left = Math.max(0, TRASH_DAYS - daysSince(sub.deleted_at));
                return (
                  <div key={sub.id} style={{ ...card, display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="item-name">{sub.name}</p>
                      <p className="item-meta">
                        Sub-deadline of {sub.parentName} · {left}d until permanently removed
                      </p>
                    </div>
                    <button onClick={() => restoreSub(sub.parentId, sub.id)} style={restoreBtn}>
                      <RotateCcw size={12} /> Restore
                    </button>
                    <button
                      onClick={() => permanentlyDeleteSub(sub.parentId, sub.id)}
                      aria-label="Delete forever"
                      style={{ ...iconBtn, color: c.red, opacity: 1 }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- Top-level component: sign-in screen or the app --------------------------

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
