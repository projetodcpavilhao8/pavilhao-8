import { useState } from "react";
import { Ban, Calendar, Clock, Loader2, Lock, LogOut, Users } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import ClassesTab from "./admin/ClassesTab";
import ReservationsTab from "./admin/ReservationsTab";
import SuspensionsTab from "./admin/SuspensionsTab";
import WeeklyTab from "./admin/WeeklyTab";
import type { ClassTemplate, Suspension } from "./admin/types";

type Tab = "weekly" | "reservations" | "classes" | "suspensions";

const TABS: { key: Tab; label: string; icon: typeof Calendar }[] = [
  { key: "weekly", label: "Semana", icon: Calendar },
  { key: "reservations", label: "Reservas", icon: Users },
  { key: "classes", label: "Horários", icon: Clock },
  { key: "suspensions", label: "Suspensões", icon: Ban },
];

const LoginForm = ({ onLoggedIn }: { onLoggedIn: () => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Login via Supabase Auth; as edge functions exigem app_metadata.role === "admin".
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      toast.error("E-mail ou senha incorretos");
      setLoading(false);
      return;
    }
    // Confirma que o usuário é admin com uma chamada sem efeito colateral.
    const { data, error: fnError } = await supabase.functions.invoke("admin", {
      body: { action: "list_reservations", payload: { status: "confirmed", limit: 1 } },
    });
    setLoading(false);
    if (fnError || data?.error) {
      await supabase.auth.signOut();
      toast.error("Este usuário não tem permissão de administrador");
      return;
    }
    setPassword("");
    onLoggedIn();
  };

  return (
    <form onSubmit={submit} className="space-y-4 py-4">
      <div>
        <Label htmlFor="admin-email">E-mail</Label>
        <Input id="admin-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="bg-secondary border-border mt-1" autoFocus />
      </div>
      <div>
        <Label htmlFor="admin-pass">Senha</Label>
        <Input id="admin-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Digite a senha" className="bg-secondary border-border mt-1" />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground font-bold rounded-full">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
      </Button>
    </form>
  );
};

const AdminDashboard = () => {
  const [open, setOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("weekly");
  const [classes, setClasses] = useState<ClassTemplate[]>([]);
  const [suspensions, setSuspensions] = useState<Suspension[]>([]);

  const loadBaseData = async () => {
    setLoading(true);
    const [classesRes, suspensionsRes] = await Promise.all([
      supabase.from("classes").select("*").order("time", { ascending: true }),
      supabase.from("class_suspensions").select("*").order("suspended_date", { ascending: true }),
    ]);
    // O admin vê TODAS as aulas, inclusive as desativadas (Vagas = 0), senão
    // uma aula zerada some do painel e não pode mais ser reativada.
    if (classesRes.data) setClasses(classesRes.data as ClassTemplate[]);
    if (suspensionsRes.data) setSuspensions(suspensionsRes.data as Suspension[]);
    if (classesRes.error || suspensionsRes.error) toast.error("Erro ao carregar horários");
    setLoading(false);
  };

  // Grade semanal e seletores só mostram aulas ativas.
  const activeClasses = classes.filter((t) => t.capacity > 0);

  const handleClose = () => {
    setOpen(false);
    setAuthenticated(false);
    setTab("weekly");
    supabase.auth.signOut();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="opacity-70 hover:opacity-100 transition-opacity px-2 py-1 rounded-md border border-border bg-card text-xs text-muted-foreground hover:text-foreground"
        aria-label="Administração"
      >
        <span className="inline-flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> Painel</span>
      </button>

      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className={`bg-card border-border max-h-[92vh] overflow-y-auto ${authenticated ? "sm:max-w-5xl" : "sm:max-w-md"}`}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{authenticated ? "Painel Pavilhão 8" : "Acesso restrito"}</DialogTitle>
          </DialogHeader>

          {!authenticated ? (
            <LoginForm onLoggedIn={() => { setAuthenticated(true); loadBaseData(); }} />
          ) : loading && classes.length === 0 ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap sticky -top-6 z-10 bg-card py-2 -mt-2 border-b border-border">
                {TABS.map(({ key, label, icon: Icon }) => (
                  <Button key={key} variant={tab === key ? "default" : "outline"} size="sm" onClick={() => setTab(key)} className="rounded-full text-xs">
                    <Icon className="w-3.5 h-3.5 mr-1" /> {label}
                  </Button>
                ))}
                <Button variant="ghost" size="sm" onClick={handleClose} className="ml-auto text-xs text-muted-foreground">
                  <LogOut className="w-3.5 h-3.5 mr-1" /> Sair
                </Button>
              </div>

              {/* As abas ficam montadas (só escondidas) para não perder filtros ao trocar. */}
              <div hidden={tab !== "weekly"}>
                <WeeklyTab classes={classes} activeClasses={activeClasses} suspensions={suspensions} active={tab === "weekly"} />
              </div>
              <div hidden={tab !== "reservations"}>
                <ReservationsTab classes={classes} activeClasses={activeClasses} active={tab === "reservations"} />
              </div>
              <div hidden={tab !== "classes"}>
                <ClassesTab classes={classes} setClasses={setClasses} />
              </div>
              <div hidden={tab !== "suspensions"}>
                <SuspensionsTab classes={classes} activeClasses={activeClasses} suspensions={suspensions} setSuspensions={setSuspensions} reload={loadBaseData} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminDashboard;
