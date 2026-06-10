import { useEffect, useState } from "react";
import { useRouter } from "../lib/router";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import { supabase } from "../lib/supabase";
import { seedDemo } from "../lib/seed";
import { fetchOrders, money, timeAgo, fmtDate, COMMISSION, typeKind, adjustBalance, uploadFile, fetchSettings, saveSettings } from "../lib/data";
import type { Order, PaymentMethod, ApiKeyConfig, Profile, Product, Transaction, PayoutRequest, Ticket, AgentRequest, Announcement, HowTo } from "../lib/types";
import { Button, Input, Textarea, Card, Spinner, Badge, EmptyState, PageHeader } from "../components/ui";
import Icon, { type IconName } from "../components/Icon";

const TABS: [string, string, IconName][] = [
  ["overview", "Overview", "chart"],
  ["orders", "Approvals", "clock"],
  ["deposits", "Deposits", "deposit"],
  ["payouts", "Payouts", "withdraw"],
  ["users", "Users", "user"],
  ["agents", "Agents", "agent"],
  ["stores", "Stores", "store"],
  ["products", "Products", "template"],
  ["affiliates", "Affiliates", "gift"],
  ["support", "Support", "ticket"],
  ["broadcast", "Broadcast", "megaphone"],
  ["announce", "Announcements", "bell"],
  ["howto", "How-To Videos", "playCircle"],
  ["payments", "Payments", "card"],
  ["contact", "Contact & Socials", "link"],
  ["ai", "AI Keys", "spark"],
  ["funds", "Adjust Funds", "coin"],
  ["settings", "Settings", "settings"],
];

export default function Admin() {
  const { profile, loading } = useAuth();
  const { navigate, query } = useRouter();
  const [tab, setTab] = useState(query.get("t") || "overview");

  useEffect(() => { if (!loading && profile && profile.role !== "admin") navigate("/"); }, [profile, loading]);

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;
  if (!profile || profile.role !== "admin")
    return (
      <div className="py-20 text-center">
        <Icon name="shield" size={40} className="mx-auto text-[#8b949e]" />
        <p className="mt-3 text-[#8b949e]">Admin access only.</p>
        <p className="mt-1 text-xs text-[#8b949e]">Sign in with the admin email (admin@brixnode.com).</p>
      </div>
    );

  return (
    <div className="animate-fade">
      <PageHeader title="Admin Control Center" subtitle="Manage everything across Brixnode" icon={<Icon name="shield" size={22} />} />

      <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map(([k, label, icon]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex flex-shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${tab === k ? "bg-teal-500/20 text-teal-300" : "bg-[#161b22] text-[#8b949e] hover:text-[#e6edf3]"}`}>
            <Icon name={icon} size={16} /> {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "overview" && <Overview />}
        {tab === "orders" && <Approvals />}
        {tab === "deposits" && <Deposits />}
        {tab === "payouts" && <PayoutRequests />}
        {tab === "users" && <Users />}
        {tab === "agents" && <AgentAdmin />}
        {tab === "stores" && <Stores />}
        {tab === "products" && <Products />}
        {tab === "affiliates" && <Affiliates />}
        {tab === "support" && <SupportAdmin />}
        {tab === "broadcast" && <Broadcast />}
        {tab === "announce" && <AnnounceAdmin />}
        {tab === "howto" && <HowToAdmin />}
        {tab === "payments" && <Payments />}
        {tab === "contact" && <ContactAdmin />}
        {tab === "ai" && <AiKeys />}
        {tab === "funds" && <Funds />}
        {tab === "settings" && <Settings />}
      </div>
    </div>
  );
}

function Stat({ label, value, icon, color }: { label: string; value: string | number; icon: IconName; color: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}><Icon name={icon} size={20} /></span>
        <div className="min-w-0"><p className="truncate text-[11px] font-semibold uppercase tracking-wide text-[#8b949e]">{label}</p><p className="truncate text-xl font-black text-[#e6edf3]">{value}</p></div>
      </div>
    </Card>
  );
}

/* ============ OVERVIEW ============ */
function Overview() {
  const [s, setS] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const [u, p, o, t] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("amount, status"),
        supabase.from("tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
      ]);
      const orders = (o.data as Order[]) || [];
      const ap = orders.filter((x) => x.status === "approved");
      setS({ users: u.count || 0, products: p.count || 0, pending: orders.filter((x) => x.status === "pending").length, sales: ap.length, revenue: ap.reduce((a, x) => a + Number(x.amount), 0), commission: ap.reduce((a, x) => a + Number(x.amount), 0) * COMMISSION, tickets: t.count || 0 });
      setLoading(false);
    })();
  }, []);
  if (loading) return <Spinner />;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <Stat label="Total users" value={s.users} icon="user" color="bg-teal-500/15 text-teal-300" />
      <Stat label="Products" value={s.products} icon="template" color="bg-purple-500/15 text-purple-300" />
      <Stat label="Pending" value={s.pending} icon="clock" color="bg-amber-500/15 text-amber-300" />
      <Stat label="Approved sales" value={s.sales} icon="checkCircle" color="bg-emerald-500/15 text-emerald-300" />
      <Stat label="Gross revenue" value={money(s.revenue)} icon="dollar" color="bg-teal-500/15 text-teal-300" />
      <Stat label="Commission" value={money(s.commission)} icon="coin" color="bg-amber-500/15 text-amber-300" />
      <Stat label="Open tickets" value={s.tickets} icon="ticket" color="bg-rose-500/15 text-rose-300" />
    </div>
  );
}

/* ============ APPROVALS ============ */
function Approvals() {
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [viewProof, setViewProof] = useState<string | null>(null);
  async function load() { setLoading(true); setOrders(await fetchOrders({ status: filter })); setLoading(false); }
  useEffect(() => { load(); }, [filter]);

  async function approve(o: Order) {
    const updates: Record<string, unknown> = { status: "approved" };
    if (o.product && typeKind(o.product.type) === "stock") {
      const items = [...(o.product.stock_items || [])];
      const idx = items.findIndex((x) => !x.sold);
      if (idx === -1) { toast("Out of stock", "error"); return; }
      items[idx].sold = true;
      updates.delivered_payload = { value: items[idx].value };
      await supabase.from("products").update({ stock_items: items, stock_count: items.filter((x) => !x.sold).length }).eq("id", o.product.id);
    }
    await supabase.from("orders").update(updates).eq("id", o.id);
    if (o.creator_id) { await adjustBalance(o.creator_id, Number(o.amount) * (1 - COMMISSION)); await supabase.from("transactions").insert({ user_id: o.creator_id, type: "sale", amount: Number(o.amount) * (1 - COMMISSION), status: "approved", method: o.payment_method }); }
    if (o.buyer_id) await supabase.from("notifications").insert({ user_id: o.buyer_id, title: "Order approved", body: `"${o.product?.title}" is unlocked. Access: ${accessUrl(o)}` });
    toast("Approved & delivered", "success"); load();
  }
  async function reject(o: Order) {
    const note = prompt("Rejection reason (optional):") || "";
    await supabase.from("orders").update({ status: "rejected", admin_note: note }).eq("id", o.id);
    if (o.buyer_id) await supabase.from("notifications").insert({ user_id: o.buyer_id, title: "Order rejected", body: `Your order was rejected. ${note}` });
    toast("Rejected", "info"); load();
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(["pending", "approved", "rejected"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize ${filter === f ? "bg-teal-500 text-white" : "bg-[#161b22] text-[#8b949e]"}`}>{f}</button>
        ))}
      </div>
      {loading ? <Spinner /> : orders.length === 0 ? <EmptyState icon={<Icon name="checkCircle" size={36} />} title={`No ${filter} orders`} desc="All caught up." /> : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Card key={o.id} className="p-4">
              <div className="flex flex-wrap items-start gap-4">
                {o.proof_url ? <button onClick={() => setViewProof(o.proof_url)} className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-[#21262d]"><img src={o.proof_url} alt="" className="h-full w-full object-cover" /></button> : <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-[#0d1117] text-xs text-[#8b949e]">No proof</div>}
                <div className="min-w-0 flex-1">
                  <p className="break-words font-bold text-[#e6edf3]">{o.product?.title}</p>
                  <p className="break-words text-sm text-[#8b949e]">{o.contact_email || "—"} {o.contact_whatsapp && `· ${o.contact_whatsapp}`}</p>
                  <p className="text-sm text-[#8b949e]">{o.payment_method} · Ref: {o.payment_reference || "—"}</p>
                  <p className="text-xs text-[#8b949e]">{timeAgo(o.created_at)}</p>
                  {o.status === "approved" && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <a href={accessUrl(o)} target="_blank" rel="noreferrer" className="rounded-lg bg-teal-500/15 px-3 py-1 text-xs font-bold text-teal-300">Access link</a>
                      {o.contact_whatsapp && <a href={waLink(o)} target="_blank" rel="noreferrer" className="rounded-lg bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">WhatsApp</a>}
                      {o.contact_email && <a href={mailLink(o)} className="rounded-lg bg-teal-500/15 px-3 py-1 text-xs font-bold text-teal-300">Email</a>}
                    </div>
                  )}
                </div>
                <p className="text-lg font-black text-[#e6edf3]">{money(o.amount)}</p>
              </div>
              {filter === "pending" && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => approve(o)}><Icon name="check" size={15} /> Approve & deliver</Button>
                  <Button size="sm" variant="danger" onClick={() => reject(o)}><Icon name="x" size={15} /> Reject</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      {viewProof && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4" onClick={() => setViewProof(null)}><img src={viewProof} alt="" className="max-h-[90vh] max-w-full rounded-xl" /></div>}
    </div>
  );
}
function accessUrl(o: Order) { return `${window.location.origin}/access/${o.access_token}`; }
function waLink(o: Order) { return `https://wa.me/${o.contact_whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Your Brixnode product "${o.product?.title}" is ready! Access: ${accessUrl(o)}`)}`; }
function mailLink(o: Order) { return `mailto:${o.contact_email}?subject=${encodeURIComponent("Your Brixnode product is ready")}&body=${encodeURIComponent(`Access: ${accessUrl(o)}`)}`; }

/* ============ DEPOSITS ============ */
function Deposits() {
  const toast = useToast();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  async function load() { const { data } = await supabase.from("transactions").select("*, user:profiles(*)").eq("type", "deposit").order("created_at", { ascending: false }); setTxs((data as Transaction[]) || []); setLoading(false); }
  useEffect(() => { load(); }, []);
  async function decide(t: Transaction, status: "approved" | "rejected") {
    await supabase.from("transactions").update({ status }).eq("id", t.id);
    if (status === "approved") { await adjustBalance(t.user_id, Number(t.amount)); await supabase.from("notifications").insert({ user_id: t.user_id, title: "Deposit approved", body: `${money(t.amount)} added to your wallet.` }); }
    toast(`Deposit ${status}`, "success"); load();
  }
  if (loading) return <Spinner />;
  if (!txs.length) return <EmptyState icon={<Icon name="deposit" size={36} />} title="No deposits" />;
  return (
    <div className="space-y-3">
      {txs.map((t) => (
        <Card key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            {t.proof_url && <a href={t.proof_url} target="_blank" rel="noreferrer"><img src={t.proof_url} className="h-14 w-14 rounded-lg object-cover" alt="" /></a>}
            <div><p className="font-bold text-[#e6edf3]">{money(t.amount)} · {t.method}</p><p className="text-xs text-[#8b949e]">@{t.user?.username} · {fmtDate(t.created_at)}</p></div>
          </div>
          {t.status === "pending" ? <div className="flex gap-2"><Button size="sm" onClick={() => decide(t, "approved")}>Approve</Button><Button size="sm" variant="danger" onClick={() => decide(t, "rejected")}>Reject</Button></div> : <Badge color={t.status === "approved" ? "green" : "rose"}>{t.status}</Badge>}
        </Card>
      ))}
    </div>
  );
}

/* ============ PAYOUT REQUESTS ============ */
function PayoutRequests() {
  const toast = useToast();
  const [reqs, setReqs] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  async function load() { const { data } = await supabase.from("payout_requests").select("*, user:profiles(*)").order("created_at", { ascending: false }); setReqs((data as PayoutRequest[]) || []); setLoading(false); }
  useEffect(() => { load(); }, []);
  async function decide(r: PayoutRequest, status: "processed" | "rejected") {
    const note = status === "rejected" ? (prompt("Reason:") || "") : "";
    await supabase.from("payout_requests").update({ status, admin_note: note }).eq("id", r.id);
    if (status === "processed") await adjustBalance(r.user_id, -Number(r.amount));
    await supabase.from("notifications").insert({ user_id: r.user_id, title: status === "processed" ? "Payout processed" : "Payout rejected", body: status === "processed" ? `${money(r.amount)} sent via ${r.method}.` : note });
    toast(`Payout ${status}`, "success"); load();
  }
  if (loading) return <Spinner />;
  if (!reqs.length) return <EmptyState icon={<Icon name="withdraw" size={36} />} title="No payout requests" />;
  return (
    <div className="space-y-3">
      {reqs.map((r) => (
        <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0"><p className="font-bold text-[#e6edf3]">{money(r.amount)} · {r.method}</p><p className="text-xs text-[#8b949e]">@{r.user?.username} · {fmtDate(r.created_at)}</p><p className="mt-1 break-words text-xs text-[#8b949e]">{r.details}</p></div>
          {r.status === "pending" ? <div className="flex gap-2"><Button size="sm" onClick={() => decide(r, "processed")}>Mark paid</Button><Button size="sm" variant="danger" onClick={() => decide(r, "rejected")}>Reject</Button></div> : <Badge color={r.status === "processed" ? "green" : "rose"}>{r.status}</Badge>}
        </Card>
      ))}
    </div>
  );
}

/* ============ USERS ============ */
function Users() {
  const toast = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  async function load() { const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }); setUsers((data as Profile[]) || []); setLoading(false); }
  useEffect(() => { load(); }, []);
  async function setStatus(u: Profile, status: string) { await supabase.from("profiles").update({ status }).eq("id", u.id); await supabase.from("notifications").insert({ user_id: u.id, title: "Account update", body: `Your account status is now: ${status}.` }); toast(`@${u.username} → ${status}`, "success"); load(); }
  async function setRole(u: Profile, role: string) { await supabase.from("profiles").update({ role }).eq("id", u.id); toast(`@${u.username} → ${role}`, "success"); load(); }
  async function notify(u: Profile) { const body = prompt(`Notify @${u.username}:`); if (!body) return; await supabase.from("notifications").insert({ user_id: u.id, title: "Message from Admin", body }); toast("Sent", "success"); }
  const filtered = users.filter((u) => (u.username || "").includes(q) || (u.email || "").includes(q));
  if (loading) return <Spinner />;
  return (
    <div>
      <Input className="mb-4 max-w-xs" placeholder="Search users..." value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="space-y-2">
        {filtered.map((u) => (
          <Card key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 text-sm font-bold text-white">{(u.username || "?").charAt(0).toUpperCase()}</span>
              <div className="min-w-0"><p className="truncate font-semibold text-[#e6edf3]">@{u.username}</p><p className="truncate text-xs text-[#8b949e]">{u.email} · {money(u.balance || 0)}</p></div>
              <Badge color={u.role === "admin" ? "rose" : u.role === "creator" ? "teal" : "slate"}>{u.role}</Badge>
              {u.status !== "active" && <Badge color="rose">{u.status}</Badge>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setRole(u, u.role === "creator" ? "buyer" : "creator")}>{u.role === "creator" ? "Demote" : "Make creator"}</Button>
              {u.status === "active" ? <><Button size="sm" variant="outline" onClick={() => setStatus(u, "suspended")}>Suspend</Button><Button size="sm" variant="danger" onClick={() => setStatus(u, "banned")}>Ban</Button></> : <Button size="sm" onClick={() => setStatus(u, "active")}>Restore</Button>}
              <Button size="sm" variant="soft" onClick={() => notify(u)}>Notify</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ============ AGENTS ============ */
function AgentAdmin() {
  const toast = useToast();
  const [reqs, setReqs] = useState<AgentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  async function load() { const { data } = await supabase.from("agent_requests").select("*, user:profiles(*)").order("created_at", { ascending: false }); setReqs((data as AgentRequest[]) || []); setLoading(false); }
  useEffect(() => { load(); }, []);
  async function decide(r: AgentRequest, approve: boolean) {
    await supabase.from("agent_requests").update({ status: approve ? "approved" : "rejected" }).eq("id", r.id);
    if (approve) await supabase.from("profiles").update({ is_agent: true, agent_approved: true, agent_id: r.agent_id, agent_level: 1 }).eq("id", r.user_id);
    await supabase.from("notifications").insert({ user_id: r.user_id, title: approve ? "Agent approved" : "Agent application rejected", body: approve ? "You are now an approved agent! Start earning commissions." : "Your agent application was not approved." });
    toast(approve ? "Agent approved" : "Rejected", "success"); load();
  }
  if (loading) return <Spinner />;
  if (!reqs.length) return <EmptyState icon={<Icon name="agent" size={36} />} title="No agent requests" desc="Applications appear here for approval." />;
  return (
    <div className="space-y-2">
      {reqs.map((r) => (
        <Card key={r.id} className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-bold text-[#e6edf3]">{r.full_name || `@${r.user?.username}`} <span className="text-xs font-normal text-[#8b949e]">@{r.user?.username}</span></p>
              <p className="text-xs text-[#8b949e]">Agent ID: {r.agent_id} · {fmtDate(r.created_at)}</p>
            </div>
            {r.status === "pending" ? <div className="flex gap-2"><Button size="sm" onClick={() => decide(r, true)}>Approve</Button><Button size="sm" variant="danger" onClick={() => decide(r, false)}>Reject</Button></div> : <Badge color={r.status === "approved" ? "green" : "rose"}>{r.status}</Badge>}
          </div>
          <div className="mt-2 grid gap-1 text-xs text-[#8b949e] sm:grid-cols-2">
            {r.email && <p className="break-words"><span className="text-[#e6edf3]">Email:</span> {r.email}</p>}
            {r.whatsapp && <p className="break-words"><span className="text-[#e6edf3]">WhatsApp:</span> {r.whatsapp}</p>}
            {r.country && <p className="break-words"><span className="text-[#e6edf3]">Country:</span> {r.country}</p>}
            {r.portfolio && <p className="break-words sm:col-span-2"><span className="text-[#e6edf3]">Portfolio:</span> {r.portfolio}</p>}
            {r.experience && <p className="break-words sm:col-span-2"><span className="text-[#e6edf3]">Experience:</span> {r.experience}</p>}
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ============ STORES ============ */
function Stores() {
  const toast = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  async function load() { const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }); setUsers((data as Profile[]) || []); setLoading(false); }
  useEffect(() => { load(); }, []);
  async function setStore(u: Profile, store_status: string) { await supabase.from("profiles").update({ store_status }).eq("id", u.id); toast(`Store ${store_status}`, "success"); load(); }
  async function del(u: Profile) { if (!confirm("Reset store design?")) return; await supabase.from("profiles").update({ store_blocks: [], store_theme: {} }).eq("id", u.id); toast("Store reset", "success"); load(); }
  if (loading) return <Spinner />;
  return (
    <div className="space-y-2">
      {users.map((u) => (
        <Card key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
          <div className="min-w-0"><p className="truncate font-bold text-[#e6edf3]">{u.store_name || `@${u.username}'s Store`}</p><a href={`/@${u.username}`} target="_blank" rel="noreferrer" className="text-xs text-teal-400">/@{u.username}</a> <Badge color={u.store_status === "suspended" ? "rose" : "green"}>{u.store_status || "active"}</Badge></div>
          <div className="flex gap-2">{u.store_status === "suspended" ? <Button size="sm" onClick={() => setStore(u, "active")}>Unsuspend</Button> : <Button size="sm" variant="outline" onClick={() => setStore(u, "suspended")}>Suspend</Button>}<Button size="sm" variant="danger" onClick={() => del(u)}>Reset</Button></div>
        </Card>
      ))}
    </div>
  );
}

/* ============ PRODUCTS ============ */
function Products() {
  const toast = useToast();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  async function load() { const { data } = await supabase.from("products").select("*, creator:profiles(*)").order("created_at", { ascending: false }); setProducts((data as Product[]) || []); setLoading(false); }
  useEffect(() => { load(); }, []);
  async function setStatus(p: Product, status: string) { await supabase.from("products").update({ status }).eq("id", p.id); toast(`Product ${status}`, "success"); load(); }
  async function feature(p: Product) { await supabase.from("products").update({ featured: !p.featured }).eq("id", p.id); load(); }
  async function del(p: Product) { if (!confirm(`Delete "${p.title}"?`)) return; await supabase.from("products").delete().eq("id", p.id); toast("Deleted", "success"); load(); }
  async function seed() { if (!user) return; setSeeding(true); const { error } = await seedDemo(user.id); if (error) toast(error, "error"); else toast("Demo products added", "success"); setSeeding(false); load(); }
  if (loading) return <Spinner />;
  return (
    <div className="space-y-2">
      <div className="mb-2 flex items-center justify-between"><p className="text-sm text-[#8b949e]">{products.length} products</p><Button size="sm" variant="soft" onClick={seed} disabled={seeding}>{seeding ? "Seeding..." : "Seed demo"}</Button></div>
      {products.length === 0 && <EmptyState icon={<Icon name="template" size={36} />} title="No products" />}
      {products.map((p) => (
        <Card key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#0d1117] text-teal-400">{p.cover_url ? <img src={p.cover_url} className="h-full w-full object-cover" alt="" /> : <Icon name="template" size={20} />}</div>
            <div className="min-w-0"><p className="truncate font-semibold text-[#e6edf3]">{p.title}</p><p className="truncate text-xs text-[#8b949e]">@{p.creator?.username} · {money(p.price)}</p></div>
            <Badge color={p.status === "published" ? "green" : "amber"}>{p.status}</Badge>{p.featured && <Badge color="amber">Featured</Badge>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => feature(p)}>{p.featured ? "Unfeature" : "Feature"}</Button>
            {p.status === "published" ? <Button size="sm" variant="outline" onClick={() => setStatus(p, "rejected")}>Unpublish</Button> : <Button size="sm" onClick={() => setStatus(p, "published")}>Publish</Button>}
            <Button size="sm" variant="danger" onClick={() => del(p)}>Delete</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ============ AFFILIATES ============ */
function Affiliates() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { supabase.from("profiles").select("*").then(({ data }) => { setUsers((data as Profile[]) || []); setLoading(false); }); }, []);
  if (loading) return <Spinner />;
  const counts: Record<string, number> = {};
  users.forEach((u) => { if (u.referred_by) counts[u.referred_by] = (counts[u.referred_by] || 0) + 1; });
  const ranked = users.map((u) => ({ u, refs: counts[u.username] || 0 })).filter((x) => x.refs > 0).sort((a, b) => b.refs - a.refs);
  return (
    <div>
      <p className="mb-4 text-sm text-[#8b949e]">Affiliate ID = username. Tracks signups via ?ref=username.</p>
      {ranked.length === 0 ? <EmptyState icon={<Icon name="gift" size={36} />} title="No referrals yet" /> : (
        <div className="space-y-2">{ranked.map(({ u, refs }, i) => (
          <Card key={u.id} className="flex items-center justify-between p-4"><div className="flex items-center gap-3"><span className="text-lg font-black text-[#30363d]">#{i + 1}</span><div><p className="font-bold text-[#e6edf3]">@{u.username}</p><p className="text-xs text-[#8b949e]">{u.email}</p></div></div><Badge color="teal">{refs} referrals</Badge></Card>
        ))}</div>
      )}
    </div>
  );
}

/* ============ SUPPORT ============ */
function SupportAdmin() {
  const toast = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  async function load() { const { data } = await supabase.from("tickets").select("*, user:profiles(*)").order("created_at", { ascending: false }); setTickets((data as Ticket[]) || []); setLoading(false); }
  useEffect(() => { load(); }, []);
  async function reply(t: Ticket) { const r = prompt(`Reply to "${t.subject}":`); if (!r) return; await supabase.from("tickets").update({ reply: r, status: "answered" }).eq("id", t.id); await supabase.from("notifications").insert({ user_id: t.user_id, title: "Support replied", body: r }); toast("Reply sent", "success"); load(); }
  async function close(t: Ticket) { await supabase.from("tickets").update({ status: "closed" }).eq("id", t.id); load(); }
  if (loading) return <Spinner />;
  if (!tickets.length) return <EmptyState icon={<Icon name="ticket" size={36} />} title="No tickets" />;
  return (
    <div className="space-y-3">{tickets.map((t) => (
      <Card key={t.id} className="p-4">
        <div className="flex items-center justify-between gap-2"><p className="break-words font-bold text-[#e6edf3]">{t.subject}</p><Badge color={t.status === "answered" ? "green" : t.status === "closed" ? "slate" : "amber"}>{t.status}</Badge></div>
        <p className="text-xs text-[#8b949e]">@{t.user?.username} · {fmtDate(t.created_at)}</p>
        <p className="mt-2 break-words text-sm text-[#8b949e]">{t.message}</p>
        {t.reply && <p className="mt-2 break-words rounded-lg bg-teal-500/10 p-2 text-sm text-[#e6edf3]"><b className="text-teal-300">You:</b> {t.reply}</p>}
        <div className="mt-3 flex gap-2"><Button size="sm" onClick={() => reply(t)}>Reply</Button><Button size="sm" variant="outline" onClick={() => close(t)}>Close</Button></div>
      </Card>
    ))}</div>
  );
}

/* ============ BROADCAST (push notifications to all) ============ */
function Broadcast() {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  async function send() {
    if (!title || !body) { toast("Fill title & message", "error"); return; }
    setBusy(true);
    const { data } = await supabase.from("profiles").select("id");
    const rows = (data || []).map((u) => ({ user_id: u.id, title, body, broadcast: true }));
    for (let i = 0; i < rows.length; i += 200) await supabase.from("notifications").insert(rows.slice(i, i + 200));
    toast(`Push sent to ${rows.length} users`, "success");
    setTitle(""); setBody(""); setBusy(false);
  }
  return (
    <Card className="max-w-lg space-y-3 p-5">
      <h3 className="flex items-center gap-2 font-bold text-[#e6edf3]"><Icon name="megaphone" size={18} className="text-teal-400" /> Push notification to all users</h3>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title" />
      <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message to everyone..." />
      <Button onClick={send} disabled={busy}><Icon name="send" size={16} /> {busy ? "Sending..." : "Send push notification"}</Button>
      <p className="text-xs text-[#8b949e]">Users receive this in real-time in their notification bell.</p>
    </Card>
  );
}

/* ============ ANNOUNCEMENTS ============ */
function AnnounceAdmin() {
  const toast = useToast();
  const [list, setList] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({ id: "", title: "", subtitle: "", body: "", image_url: "", video_url: "", tag: "OFFICIAL UPDATE", date: "" });
  async function load() { const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false }); setList((data as Announcement[]) || []); setLoading(false); }
  useEffect(() => { load(); }, []);
  async function up(f2: File | null, key: "image_url" | "video_url") { if (!f2) return; const r = await uploadFile(f2, "announcements"); if (r.url) { setF((s) => ({ ...s, [key]: r.url! })); toast("Uploaded", "success"); } else toast("Upload failed", "error"); }
  async function save() {
    if (!f.title) { toast("Title required", "error"); return; }
    const payload = { title: f.title, subtitle: f.subtitle, body: f.body, image_url: f.image_url, video_url: f.video_url, tag: f.tag, date: f.date || new Date().toLocaleDateString() };
    const res = f.id ? await supabase.from("announcements").update(payload).eq("id", f.id) : await supabase.from("announcements").insert(payload);
    if (res.error) { toast(res.error.message, "error"); return; }
    toast("Saved", "success"); setF({ id: "", title: "", subtitle: "", body: "", image_url: "", video_url: "", tag: "OFFICIAL UPDATE", date: "" }); load();
  }
  async function del(id: string) { if (!confirm("Delete?")) return; await supabase.from("announcements").delete().eq("id", id); load(); }
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="space-y-3 p-5">
        <h3 className="font-bold text-[#e6edf3]">{f.id ? "Edit" : "New"} announcement</h3>
        <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Title" />
        <Input value={f.subtitle} onChange={(e) => setF({ ...f, subtitle: e.target.value })} placeholder="Subtitle / banner text" />
        <Input value={f.tag} onChange={(e) => setF({ ...f, tag: e.target.value })} placeholder="Tag (e.g. OFFICIAL UPDATE)" />
        <Textarea rows={4} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} placeholder="Body text" />
        <div className="flex gap-2">
          <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#21262d] p-2.5 text-xs font-semibold text-[#8b949e]"><Icon name="upload" size={15} /> {f.image_url ? "Image set" : "Banner image"}<input type="file" accept="image/*" className="hidden" onChange={(e) => up(e.target.files?.[0] || null, "image_url")} /></label>
          <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#21262d] p-2.5 text-xs font-semibold text-[#8b949e]"><Icon name="play" size={15} /> {f.video_url ? "Video set" : "Video"}<input type="file" accept="video/*" className="hidden" onChange={(e) => up(e.target.files?.[0] || null, "video_url")} /></label>
        </div>
        <Button onClick={save}>{f.id ? "Update" : "Publish"}</Button>
      </Card>
      <div className="space-y-2">
        {loading ? <Spinner /> : list.map((a) => (
          <Card key={a.id} className="flex items-center justify-between gap-3 p-3">
            <div className="flex min-w-0 items-center gap-3">{a.image_url && <img src={a.image_url} className="h-12 w-16 rounded object-cover" alt="" />}<div className="min-w-0"><p className="truncate font-semibold text-[#e6edf3]">{a.title}</p><p className="truncate text-xs text-[#8b949e]">{a.tag}</p></div></div>
            <div className="flex gap-2"><Button size="sm" variant="soft" onClick={() => setF({ id: a.id, title: a.title, subtitle: a.subtitle, body: a.body, image_url: a.image_url, video_url: a.video_url || "", tag: a.tag, date: a.date })}>Edit</Button><Button size="sm" variant="danger" onClick={() => del(a.id)}>Del</Button></div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ============ HOW-TO VIDEOS ============ */
function HowToAdmin() {
  const toast = useToast();
  const [list, setList] = useState<HowTo[]>([]);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({ id: "", title: "", description: "", video_url: "", image_url: "" });
  async function load() { const { data } = await supabase.from("how_to").select("*").order("sort", { ascending: true }); setList((data as HowTo[]) || []); setLoading(false); }
  useEffect(() => { load(); }, []);
  async function up(f2: File | null, key: "image_url" | "video_url") { if (!f2) return; toast("Uploading...", "info"); const r = await uploadFile(f2, "howto"); if (r.url) { setF((s) => ({ ...s, [key]: r.url! })); toast("Uploaded", "success"); } else toast("Upload failed", "error"); }
  async function save() {
    if (!f.title) { toast("Title required", "error"); return; }
    const payload = { title: f.title, description: f.description, video_url: f.video_url, image_url: f.image_url };
    const res = f.id ? await supabase.from("how_to").update(payload).eq("id", f.id) : await supabase.from("how_to").insert(payload);
    if (res.error) { toast(res.error.message, "error"); return; }
    toast("Saved", "success"); setF({ id: "", title: "", description: "", video_url: "", image_url: "" }); load();
  }
  async function del(id: string) { if (!confirm("Delete?")) return; await supabase.from("how_to").delete().eq("id", id); load(); }
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="space-y-3 p-5">
        <h3 className="font-bold text-[#e6edf3]">{f.id ? "Edit" : "Add"} how-to video</h3>
        <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Video title" />
        <Textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Description" />
        <Input value={f.video_url} onChange={(e) => setF({ ...f, video_url: e.target.value })} placeholder="Video URL (YouTube/Vimeo/mp4) or upload" />
        <div className="flex gap-2">
          <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#21262d] p-2.5 text-xs font-semibold text-[#8b949e]"><Icon name="play" size={15} /> {f.video_url ? "Video set" : "Upload video"}<input type="file" accept="video/*" className="hidden" onChange={(e) => up(e.target.files?.[0] || null, "video_url")} /></label>
          <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#21262d] p-2.5 text-xs font-semibold text-[#8b949e]"><Icon name="upload" size={15} /> {f.image_url ? "Thumb set" : "Thumbnail"}<input type="file" accept="image/*" className="hidden" onChange={(e) => up(e.target.files?.[0] || null, "image_url")} /></label>
        </div>
        <Button onClick={save}>{f.id ? "Update" : "Add video"}</Button>
      </Card>
      <div className="space-y-2">
        {loading ? <Spinner /> : list.map((v) => (
          <Card key={v.id} className="flex items-center justify-between gap-3 p-3">
            <div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/15 text-teal-300"><Icon name="playCircle" size={20} /></span><p className="truncate font-semibold text-[#e6edf3]">{v.title}</p></div>
            <div className="flex gap-2"><Button size="sm" variant="soft" onClick={() => setF({ id: v.id, title: v.title, description: v.description, video_url: v.video_url, image_url: v.image_url })}>Edit</Button><Button size="sm" variant="danger" onClick={() => del(v.id)}>Del</Button></div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ============ PAYMENTS ============ */
const PRESET: [string, string][] = [["bank", "Bank Transfer"], ["card", "PayPal"], ["coin", "Crypto USDT"], ["globe", "Wise"], ["phone", "M-Pesa"], ["phone", "MTN MoMo"], ["phone", "Orange Money"], ["phone", "Airtel Money"], ["card", "Bkash"], ["card", "Nagad"]];
function Payments() {
  const toast = useToast();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ id: "", label: "", icon: "card", details: "" });
  async function load() { const { data } = await supabase.from("payment_methods").select("*").order("label"); setMethods((data as PaymentMethod[]) || []); setLoading(false); }
  useEffect(() => { load(); }, []);
  async function save() {
    if (!form.label || !form.details) { toast("Fill label & details", "error"); return; }
    const res = form.id ? await supabase.from("payment_methods").update({ label: form.label, icon: form.icon, details: form.details }).eq("id", form.id) : await supabase.from("payment_methods").insert({ label: form.label, icon: form.icon, details: form.details, active: true });
    if (res.error) { toast(res.error.message + " — run v3 SQL?", "error"); return; }
    toast(form.id ? "Updated" : "Added", "success"); setForm({ id: "", label: "", icon: "card", details: "" }); load();
  }
  async function toggle(m: PaymentMethod) { await supabase.from("payment_methods").update({ active: !m.active }).eq("id", m.id); load(); }
  async function remove(id: string) { if (!confirm("Delete?")) return; await supabase.from("payment_methods").delete().eq("id", id); load(); }
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="space-y-3 p-5">
        <h3 className="font-bold text-[#e6edf3]">{form.id ? "Edit" : "Add"} payment method</h3>
        <div className="flex flex-wrap gap-1.5">{PRESET.map(([icon, label]) => <button key={label} onClick={() => setForm({ ...form, label, icon })} className="rounded-lg bg-[#0d1117] px-2.5 py-1.5 text-xs font-semibold text-[#8b949e]">{label}</button>)}</div>
        <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Method label" />
        <Textarea rows={4} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder={"Account / wallet / instructions buyers will see"} />
        <div className="flex gap-2"><Button onClick={save}>{form.id ? "Update" : "Add"}</Button>{form.id && <Button variant="ghost" onClick={() => setForm({ id: "", label: "", icon: "card", details: "" })}>Cancel</Button>}</div>
        <p className="text-xs text-[#8b949e]">Shown at checkout & in withdraw options.</p>
      </Card>
      <div className="space-y-3">
        <h3 className="font-bold text-[#e6edf3]">Configured ({methods.length})</h3>
        {loading ? <Spinner /> : methods.map((m) => (
          <Card key={m.id} className="p-4"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Icon name={(m.icon as IconName) in iconSet ? (m.icon as IconName) : "card"} size={18} className="text-teal-400" /><span className="font-semibold text-[#e6edf3]">{m.label}</span><Badge color={m.active ? "green" : "slate"}>{m.active ? "active" : "hidden"}</Badge></div><div className="flex gap-2"><Button size="sm" variant="soft" onClick={() => setForm({ id: m.id, label: m.label, icon: m.icon, details: m.details })}>Edit</Button><Button size="sm" variant="outline" onClick={() => toggle(m)}>{m.active ? "Hide" : "Show"}</Button><Button size="sm" variant="danger" onClick={() => remove(m.id)}>Del</Button></div></div><p className="mt-2 whitespace-pre-wrap break-words text-xs text-[#8b949e]">{m.details}</p></Card>
        ))}
      </div>
    </div>
  );
}
const iconSet: Record<string, boolean> = { card: true, bank: true, coin: true, globe: true, phone: true, wallet: true, dollar: true };

/* ============ CONTACT & SOCIALS ============ */
function ContactAdmin() {
  const toast = useToast();
  const [s, setS] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetchSettings().then(setS); }, []);
  async function save() { setBusy(true); const { error } = await saveSettings(s); if (error) toast(error.message, "error"); else toast("Saved", "success"); setBusy(false); }
  const fields: [string, string, IconName][] = [
    ["email", "Support Email", "mail"], ["whatsapp", "WhatsApp Number", "whatsapp"], ["whatsapp_channel", "WhatsApp Channel URL", "whatsapp"],
    ["telegram", "Telegram URL", "telegram"], ["facebook", "Facebook URL", "facebook"], ["instagram", "Instagram URL", "instagram"],
    ["tiktok", "TikTok URL", "tiktok"], ["twitter", "Twitter/X URL", "twitter"], ["youtube", "YouTube URL", "youtube"], ["support_hours", "Support Hours", "clock"],
  ];
  return (
    <Card className="max-w-lg space-y-3 p-5">
      <h3 className="flex items-center gap-2 font-bold text-[#e6edf3]"><Icon name="link" size={18} className="text-teal-400" /> Contact & Social links</h3>
      <p className="text-xs text-[#8b949e]">These appear across the app (footer, profile, support).</p>
      {fields.map(([key, label, icon]) => (
        <div key={key}>
          <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[#8b949e]"><Icon name={icon} size={14} /> {label}</label>
          <Input value={s[key] || ""} onChange={(e) => setS({ ...s, [key]: e.target.value })} placeholder={label} />
        </div>
      ))}
      <Button onClick={save} disabled={busy}>{busy ? "Saving..." : "Save settings"}</Button>
    </Card>
  );
}

/* ============ AI KEYS ============ */
function AiKeys() {
  const toast = useToast();
  const [keys, setKeys] = useState<ApiKeyConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ provider: "OpenAI", key_value: "", model: "gpt-4o-mini" });
  async function load() { const { data } = await supabase.from("api_keys").select("*"); setKeys((data as ApiKeyConfig[]) || []); setLoading(false); }
  useEffect(() => { load(); }, []);
  async function add() { if (!form.key_value) { toast("Enter the key", "error"); return; } await supabase.from("api_keys").insert({ ...form, active: true }); toast("Saved", "success"); setForm({ provider: "OpenAI", key_value: "", model: "gpt-4o-mini" }); load(); }
  async function toggle(k: ApiKeyConfig) { if (!k.active) await supabase.from("api_keys").update({ active: false }).neq("id", k.id); await supabase.from("api_keys").update({ active: !k.active }).eq("id", k.id); load(); }
  async function remove(id: string) { await supabase.from("api_keys").delete().eq("id", id); load(); }
  const providers = ["OpenAI", "Grok (xAI)", "Gemini (Google)", "Groq", "Anthropic"];
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="space-y-3 p-5">
        <h3 className="font-bold text-[#e6edf3]">Add / rotate AI key</h3>
        <div className="flex flex-wrap gap-1.5">{providers.map((p) => <button key={p} onClick={() => setForm({ ...form, provider: p })} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${form.provider === p ? "bg-teal-500 text-white" : "bg-[#0d1117] text-[#8b949e]"}`}>{p}</button>)}</div>
        <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Model" />
        <Input type="password" value={form.key_value} onChange={(e) => setForm({ ...form, key_value: e.target.value })} placeholder="API key" />
        <Button onClick={add}>Save key</Button>
      </Card>
      <div className="space-y-3">
        <h3 className="font-bold text-[#e6edf3]">Providers</h3>
        {loading ? <Spinner /> : keys.length === 0 ? <p className="text-sm text-[#8b949e]">No keys (AI demo mode).</p> : keys.map((k) => (
          <Card key={k.id} className="flex items-center justify-between p-4"><div><p className="font-semibold text-[#e6edf3]">{k.provider}</p><p className="text-xs text-[#8b949e]">{k.model} · ••••{k.key_value.slice(-4)}</p></div><div className="flex items-center gap-2"><Badge color={k.active ? "green" : "slate"}>{k.active ? "active" : "off"}</Badge><Button size="sm" variant="outline" onClick={() => toggle(k)}>{k.active ? "Disable" : "Enable"}</Button><Button size="sm" variant="danger" onClick={() => remove(k.id)}>Del</Button></div></Card>
        ))}
      </div>
    </div>
  );
}

/* ============ FUNDS ============ */
function Funds() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Profile | null>(null);
  const [amount, setAmount] = useState("");
  async function search() { const { data } = await supabase.from("profiles").select("*").eq("username", q).maybeSingle(); if (!data) { toast("Not found", "error"); setFound(null); } else setFound(data as Profile); }
  async function adjust(sign: 1 | -1) {
    if (!found || !Number(amount)) return;
    await adjustBalance(found.id, sign * Number(amount));
    await supabase.from("transactions").insert({ user_id: found.id, type: sign > 0 ? "admin_credit" : "admin_debit", amount: Number(amount), status: "approved", method: "admin adjustment" });
    await supabase.from("notifications").insert({ user_id: found.id, title: "Wallet adjusted", body: `${sign > 0 ? "Added" : "Deducted"} ${money(Number(amount))} ${sign > 0 ? "to" : "from"} your wallet.` });
    toast("Balance updated", "success"); search();
  }
  return (
    <Card className="max-w-lg space-y-3 p-5">
      <h3 className="flex items-center gap-2 font-bold text-[#e6edf3]"><Icon name="coin" size={18} className="text-amber-400" /> Add / deduct user funds</h3>
      <div className="flex gap-2"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="username" /><Button onClick={search}>Find</Button></div>
      {found && (
        <div className="space-y-3 rounded-xl bg-[#0d1117] p-4">
          <p className="text-sm text-[#e6edf3]">@{found.username} · Balance: <b className="text-emerald-400">{money(found.balance || 0)}</b></p>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" />
          <div className="flex gap-2"><Button onClick={() => adjust(1)}><Icon name="plus" size={15} /> Add</Button><Button variant="danger" onClick={() => adjust(-1)}>Deduct</Button></div>
        </div>
      )}
    </Card>
  );
}

/* ============ SETTINGS ============ */
function Settings() {
  return (
    <Card className="max-w-xl space-y-3 p-5">
      <h3 className="flex items-center gap-2 font-bold text-[#e6edf3]"><Icon name="settings" size={18} className="text-teal-400" /> Platform settings</h3>
      <Row label="Platform commission" value={`${COMMISSION * 100}%`} note="Edit COMMISSION in src/lib/data.ts" />
      <Row label="Admin email" value="admin@brixnode.com" note="Edit ADMIN_EMAILS in src/lib/auth.tsx" />
      <Row label="Storage bucket" value="uploads (public)" note="Create in Supabase dashboard" />
      <Row label="Schema" value="supabase_schema.sql" note="Run latest version in SQL editor" />
    </Card>
  );
}
function Row({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="flex items-center justify-between rounded-xl bg-[#0d1117] p-3"><div><p className="text-sm font-semibold text-[#e6edf3]">{label}</p><p className="text-xs text-[#8b949e]">{note}</p></div><span className="font-mono text-sm text-teal-300">{value}</span></div>;
}
