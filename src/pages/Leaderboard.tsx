import { useEffect, useState } from "react";
import { useRouter } from "../lib/router";
import { supabase } from "../lib/supabase";
import type { Profile } from "../lib/types";
import { Spinner, PageHeader } from "../components/ui";
import Icon from "../components/Icon";

export default function Leaderboard() {
  const { navigate } = useRouter();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("profiles").select("*").order("balance", { ascending: false }).limit(50).then(({ data }) => {
      setUsers((data as Profile[]) || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="mx-auto max-w-lg animate-fade space-y-5 pb-10">
      <PageHeader title="Leaderboard" icon={<Icon name="trophy" size={22} />} onBack={() => navigate("/profile")} />

      <div className="space-y-2">
        {users.length === 0 && <p className="py-10 text-center text-[#8b949e]">No users yet.</p>}
        {users.map((u, i) => (
          <div key={u.id} className="flex items-center gap-3 rounded-xl p-3" style={{ background: i < 3 ? "linear-gradient(135deg, rgba(245,158,11,.15), rgba(20,184,166,.1))" : "#161b22", border: i < 3 ? "1px solid rgba(245,158,11,.3)" : "1px solid #21262d" }}>
            <span className={`flex w-8 justify-center font-black ${i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-[#8b949e]"}`}>{i < 3 ? <Icon name="trophy" size={18} /> : `#${i + 1}`}</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 text-xs font-bold text-white">{(u.username || "?").charAt(0).toUpperCase()}</div>
            <div className="flex-1"><p className="font-bold text-[#e6edf3]">@{u.username}</p><p className="text-xs text-[#8b949e]">{u.full_name}</p></div>
            <p className="font-black text-teal-400">${(u.balance || 0).toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
