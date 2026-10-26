"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LuCheck,
  LuChevronDown,
  LuCopy,
  LuCrown,
  LuShare2,
  LuSwords,
  LuTrophy,
  LuUserMinus,
  LuUserPlus,
  LuUsers,
  LuX,
} from "react-icons/lu";
import { cn } from "@/lib/cn";
import { AREAS, BATTLE_CATEGORIES, areaLabel } from "@/lib/areas";
import { askConfirm, pushToast } from "@/lib/store/app-store";
import { Button } from "@/components/ui/button";
import { Chip, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { EmptyState, Page, PageHeader, ProgressBar } from "@/components/ui/page";
import { Tabs } from "@/components/ui/tabs";
import { loadSocial, socialAction, useSocial, type Battle, type Group, type SocialState } from "./social-store";

type Tab = "batalhas" | "amigos" | "grupos";
const DAYS = [1, 3, 7, 14, 30];

/** Mostra o erro da ação (ou a mensagem de sucesso). */
async function act(action: string, args: Record<string, unknown>, success?: string) {
  const err = await socialAction(action, args);
  if (err) pushToast({ message: err });
  else if (success) pushToast({ message: success });
  return !err;
}

export function SocialPage() {
  const status = useSocial((s) => s.status);
  const data = useSocial((s) => s.data);
  const [tab, setTab] = useState<Tab>("batalhas");
  const [codeInput, setCodeInput] = useState("");
  const [newBattle, setNewBattle] = useState<{ opponent?: string; group?: string } | null>(null);
  const [newGroup, setNewGroup] = useState(false);

  useEffect(() => {
    void loadSocial();
    // Link de convite: /amigos?codigo=ABC123 já preenche o código.
    const code = new URLSearchParams(window.location.search).get("codigo");
    if (code) {
      setCodeInput(code.toUpperCase().slice(0, 6));
      setTab("amigos");
    }
    // A atualização automática (a cada 20 s) fica no AppShell.
  }, []);

  if (!data) {
    return (
      <Page>
        <PageHeader title="Amigos" description="Desafie amigos em batalhas de pontos." />
        {status === "error" ? (
          <EmptyState
            title="Não deu para carregar seus amigos"
            body="Confira a conexão com a internet e tente de novo."
            action={
              <Button variant="primary" onClick={() => void loadSocial()}>
                Tentar de novo
              </Button>
            }
          />
        ) : (
          <div aria-busy="true" aria-label="Carregando" className="space-y-3">
            <div className="h-28 animate-pulse rounded-3xl bg-surface-2" />
            <div className="h-48 animate-pulse rounded-3xl bg-surface-2" />
          </div>
        )}
      </Page>
    );
  }

  const battleInvites = data.battles.filter((b) => b.myStatus === "convidado" && (b.status === "pendente" || b.status === "ativa")).length;
  const groupInvites = data.groups.filter((g) => g.status === "convidado").length;

  return (
    <Page>
      <PageHeader title="Amigos" description="Desafie amigos em batalhas de pontos. Quem fizer mais no período vence." />

      <MyCode code={data.me.code} />

      <div className="mt-6">
        <Tabs
          label="Seções"
          value={tab}
          onChange={setTab}
          items={[
            { value: "batalhas", label: "Batalhas", count: battleInvites || undefined },
            { value: "amigos", label: "Amigos", count: data.incoming.length || undefined },
            { value: "grupos", label: "Grupos", count: groupInvites || undefined },
          ]}
        />
      </div>

      <div className="mt-6">
        {tab === "batalhas" && <BattlesTab data={data} onNew={() => setNewBattle({})} onGoFriends={() => setTab("amigos")} />}
        {tab === "amigos" && (
          <FriendsTab data={data} code={codeInput} setCode={setCodeInput} onChallenge={(id) => setNewBattle({ opponent: id })} />
        )}
        {tab === "grupos" && (
          <GroupsTab data={data} onNew={() => setNewGroup(true)} onChallenge={(id) => setNewBattle({ group: id })} onGoFriends={() => setTab("amigos")} />
        )}
      </div>

      {newBattle && (
        <NewBattleDialog
          data={data}
          preset={newBattle}
          onClose={() => setNewBattle(null)}
          onCreated={() => {
            setNewBattle(null);
            setTab("batalhas");
          }}
        />
      )}
      {newGroup && <GroupDialog data={data} onClose={() => setNewGroup(false)} />}
    </Page>
  );
}

/* ---------------------------------------------------------------- código */

function MyCode({ code }: { code: string }) {
  const link = typeof window !== "undefined" ? `${window.location.origin}/amigos?codigo=${code}` : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      pushToast({ message: "Código copiado" });
    } catch {
      pushToast({ message: `Seu código: ${code}` });
    }
  };
  const share = async () => {
    const text = `Me adiciona no Prisma! Meu código de amigo é ${code}.`;
    try {
      if (navigator.share) await navigator.share({ title: "Prisma", text, url: link });
      else {
        await navigator.clipboard.writeText(`${text} ${link}`);
        pushToast({ message: "Convite copiado. Cole onde quiser enviar." });
      }
    } catch {
      /* a pessoa fechou o compartilhamento */
    }
  };
  return (
    <section aria-labelledby="meu-codigo" className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5 sm:flex-row sm:items-center sm:p-6">
      <div className="min-w-0 flex-1">
        <h2 id="meu-codigo" className="text-meta font-semibold text-ink-2">
          Seu código de amigo
        </h2>
        <p className="tabular mt-1 font-mono text-[28px] font-semibold tracking-[0.18em] text-ink">{code}</p>
        <p className="text-meta text-ink-3">Envie para seus amigos adicionarem você.</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Button onClick={copy}>
          <LuCopy className="size-4" aria-hidden />
          Copiar
        </Button>
        <Button variant="primary" onClick={share}>
          <LuShare2 className="size-4" aria-hidden />
          Convidar
        </Button>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- batalhas */

function timeLeft(endsAt: string) {
  const ms = Date.parse(endsAt) - Date.now();
  if (ms <= 0) return "terminou";
  const h = Math.floor(ms / 3_600_000);
  if (h >= 48) return `termina em ${Math.round(h / 24)} dias`;
  if (h >= 1) return `termina em ${h} h`;
  return `termina em ${Math.max(1, Math.round(ms / 60_000))} min`;
}

function battleTitle(b: Battle, meId: string) {
  if (b.group) return b.group.name;
  const other = b.players.find((p) => p.id !== meId);
  return `Você x ${other?.name ?? "amigo"}`;
}

function BattlesTab({ data, onNew, onGoFriends }: { data: SocialState; onNew: () => void; onGoFriends: () => void }) {
  const invites = data.battles.filter((b) => b.myStatus === "convidado" && (b.status === "pendente" || b.status === "ativa"));
  const live = data.battles.filter((b) => b.myStatus === "aceito" && (b.status === "pendente" || b.status === "ativa"));
  const done = data.battles.filter((b) => b.status === "encerrada");
  const canBattle = data.friends.length > 0;

  return (
    <div className="space-y-8">
      {canBattle ? (
        <Button variant="primary" className="h-12 w-full sm:w-auto" onClick={onNew}>
          <LuSwords className="size-4" aria-hidden />
          Nova batalha
        </Button>
      ) : (
        <EmptyState
          title="Adicione um amigo para começar"
          body="Com amigos no Prisma, vocês se desafiam em batalhas de pontos."
          action={
            <Button variant="primary" onClick={onGoFriends}>
              <LuUserPlus className="size-4" aria-hidden />
              Adicionar amigo
            </Button>
          }
        />
      )}

      {invites.length > 0 && (
        <section aria-labelledby="desafios">
          <h2 id="desafios" className="mb-3 text-lead font-semibold text-ink">
            Desafios para você
          </h2>
          <ul className="space-y-3">
            {invites.map((b) => (
              <li key={b.id} className="rounded-3xl border-2 border-accent bg-accent-soft p-5">
                <p className="font-semibold text-ink">
                  {b.createdBy.name} desafiou {b.group ? `o grupo ${b.group.name}` : "você"}
                </p>
                <p className="mt-1 text-meta text-ink-2">
                  Categoria {areaLabel(b.category)} · {timeLeft(b.endsAt)}
                </p>
                <div className="mt-4 flex gap-2">
                  <Button variant="primary" onClick={() => act("responder-batalha", { battle: b.id, accept: true }, "Desafio aceito. Boa sorte!")}>
                    <LuCheck className="size-4" aria-hidden />
                    Aceitar
                  </Button>
                  <Button variant="ghost" onClick={() => act("responder-batalha", { battle: b.id, accept: false })}>
                    Recusar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {live.length > 0 && (
        <section aria-labelledby="andamento">
          <h2 id="andamento" className="mb-3 text-lead font-semibold text-ink">
            Em andamento
          </h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {live.map((b) => (
              <BattleCard key={b.id} battle={b} meId={data.me.id} />
            ))}
          </ul>
        </section>
      )}

      {done.length > 0 && (
        <section aria-labelledby="encerradas">
          <h2 id="encerradas" className="mb-3 text-lead font-semibold text-ink">
            Encerradas
          </h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {done.map((b) => (
              <BattleCard key={b.id} battle={b} meId={data.me.id} />
            ))}
          </ul>
        </section>
      )}

      <HowPointsWork />
    </div>
  );
}

function BattleCard({ battle: b, meId }: { battle: Battle; meId: string }) {
  const ranked = [...b.players].sort((x, y) => (y.points ?? -1) - (x.points ?? -1));
  const max = Math.max(1, ...ranked.map((p) => p.points ?? 0));
  const ended = b.status === "encerrada";
  const top = ranked[0]?.points ?? 0;
  const winners = ranked.filter((p) => p.status === "aceito" && (p.points ?? 0) === top);
  const result = !ended
    ? null
    : top === 0
      ? "Ninguém fez pontos"
      : winners.length > 1
        ? "Empate"
        : winners[0].id === meId
          ? "Você venceu!"
          : `${winners[0].name} venceu`;

  return (
    <li className={cn("rounded-3xl border bg-surface p-5", ended ? "border-line" : "border-primary/40")}>
      <div className="flex items-start gap-3">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-2xl", ended ? "bg-accent text-on-accent" : "bg-primary text-on-primary")}>
          {ended ? <LuTrophy className="size-5" aria-hidden /> : <LuSwords className="size-5" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-ink">{battleTitle(b, meId)}</h3>
          <p className="text-meta text-ink-2">
            {areaLabel(b.category)} · {ended ? `terminou em ${new Date(b.endsAt).toLocaleDateString("pt-BR")}` : timeLeft(b.endsAt)}
          </p>
        </div>
        {result && <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-meta font-semibold text-accent-ink">{result}</span>}
      </div>

      <ol className="mt-4 space-y-2.5">
        {ranked.map((p, i) => (
          <li key={p.id}>
            <div className="flex items-baseline gap-2">
              <span className="tabular w-5 shrink-0 text-meta font-semibold text-ink-3">{p.status === "aceito" ? `${i + 1}º` : ""}</span>
              <span className={cn("min-w-0 flex-1 truncate", p.id === meId ? "font-semibold text-ink" : "text-ink")}>
                {p.id === meId ? "Você" : p.name}
                {ended && p.status === "aceito" && (p.points ?? 0) === top && top > 0 && (
                  <LuCrown className="ml-1.5 inline size-3.5 -translate-y-px text-accent-ink" aria-label="vencedor" />
                )}
              </span>
              <span className="tabular shrink-0 text-meta font-semibold text-ink-2">
                {p.status === "aceito" ? `${p.points ?? 0} pts` : "aguardando"}
              </span>
            </div>
            {p.status === "aceito" && (
              <ProgressBar
                value={p.points ?? 0}
                max={max}
                tone={p.id === meId ? "primary" : "accent"}
                label={`Pontos de ${p.id === meId ? "você" : p.name}`}
                className="ml-7 mt-1"
              />
            )}
          </li>
        ))}
      </ol>

      {b.status === "pendente" && b.mine && (
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
          <p className="text-meta text-ink-3">Esperando aceitarem o desafio.</p>
          <Button size="sm" variant="ghost" onClick={() => act("cancelar-batalha", { battle: b.id }, "Batalha cancelada")}>
            Cancelar
          </Button>
        </div>
      )}
    </li>
  );
}

function HowPointsWork() {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-3xl border border-line bg-surface">
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 px-5 py-4 text-left">
        <span className="flex-1 font-semibold text-ink">Como os pontos contam</span>
        <LuChevronDown className={cn("size-4 text-ink-3 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div className="space-y-2 border-t border-line px-5 pb-5 pt-4 text-ink-2">
          <p>Os pontos são os mesmos XP do app: concluir tarefas, marcar hábitos, sessões de foco e registros de treino.</p>
          <p>
            <b className="text-ink">A categoria vem do módulo.</b> Cada módulo tem uma categoria ({AREAS.map((a) => a.label).join(", ")}), que você
            escolhe ao criar ou editar o módulo. Tarefas, hábitos e sessões de foco ligados a ele contam nessa categoria. O que não tem módulo
            conta como Pessoal, e os registros da aba Treino contam como Treino.
          </p>
          <p>
            Para batalhas de Alimentação ou Sono, crie um módulo (por exemplo, “Alimentação”) com essa categoria e coloque nele os hábitos, como
            beber água ou dormir cedo.
          </p>
          <p>Na categoria Geral, tudo conta.</p>
          <p>Só valem os pontos feitos durante a batalha, com no máximo 400 pontos por pessoa por dia, para ninguém trapacear.</p>
        </div>
      )}
    </section>
  );
}

function NewBattleDialog({
  data,
  preset,
  onClose,
  onCreated,
}: {
  data: SocialState;
  preset: { opponent?: string; group?: string };
  onClose: () => void;
  onCreated: () => void;
}) {
  const groups = data.groups.filter((g) => g.status === "membro" && g.members.some((m) => m.status === "membro" && m.id !== data.me.id));
  const [mode, setMode] = useState<"amigo" | "grupo">(preset.group ? "grupo" : "amigo");
  const [opponent, setOpponent] = useState(preset.opponent ?? data.friends[0]?.id ?? "");
  const [group, setGroup] = useState(preset.group ?? groups[0]?.id ?? "");
  const [category, setCategory] = useState("geral");
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const ends = new Date(Date.now() + days * 86_400_000);
  const target = mode === "amigo" ? opponent : group;

  const submit = async () => {
    setBusy(true);
    const ok = await act("criar-batalha", { ...(mode === "amigo" ? { opponent } : { group }), category, days }, "Desafio enviado");
    setBusy(false);
    if (ok) onCreated();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Nova batalha"
      description="Quem fizer mais pontos no período vence."
      size="sm"
      footer={
        <div className="ml-auto flex gap-2">
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={!target || busy} onClick={submit}>
            <LuSwords className="size-4" aria-hidden />
            Enviar desafio
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div role="radiogroup" aria-label="Contra quem" className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1">
          {(["amigo", "grupo"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={cn("h-10 rounded-xl font-semibold transition-colors", mode === m ? "bg-surface text-ink shadow-sm" : "text-ink-2")}
            >
              {m === "amigo" ? "Um amigo" : "Um grupo"}
            </button>
          ))}
        </div>

        {mode === "amigo" ? (
          <PickList
            label="Amigo"
            empty="Você ainda não tem amigos."
            value={opponent}
            onChange={setOpponent}
            options={data.friends.map((f) => ({ id: f.id, label: f.name }))}
          />
        ) : (
          <PickList
            label="Grupo"
            empty="Você não está em nenhum grupo com mais gente. Crie um na aba Grupos."
            value={group}
            onChange={setGroup}
            options={groups.map((g) => ({ id: g.id, label: g.name, hint: `${g.members.filter((x) => x.status === "membro").length} pessoas` }))}
          />
        )}

        <div>
          <p className="mb-2 text-meta font-semibold text-ink-2">Categoria</p>
          <div className="flex flex-wrap gap-2">
            {BATTLE_CATEGORIES.map((c) => (
              <Chip key={c.id} selected={category === c.id} onClick={() => setCategory(c.id)}>
                {c.label}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-meta font-semibold text-ink-2">Duração</p>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => (
              <Chip key={d} selected={days === d} onClick={() => setDays(d)}>
                {d === 1 ? "1 dia" : `${d} dias`}
              </Chip>
            ))}
          </div>
          <p className="mt-2 text-meta text-ink-3">
            Começa agora e termina em {ends.toLocaleDateString("pt-BR")} às {ends.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.
          </p>
        </div>
      </div>
    </Modal>
  );
}

function PickList({
  label,
  empty,
  value,
  onChange,
  options,
}: {
  label: string;
  empty: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ id: string; label: string; hint?: string }>;
}) {
  if (options.length === 0) return <p className="rounded-2xl bg-surface-2 p-4 text-ink-2">{empty}</p>;
  return (
    <div role="radiogroup" aria-label={label} className="max-h-56 space-y-1.5 overflow-y-auto scrollbar-thin">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors",
            value === o.id ? "border-primary bg-primary-soft" : "border-line hover:border-line-strong",
          )}
        >
          <Avatar name={o.label} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-ink">{o.label}</span>
            {o.hint && <span className="block text-meta text-ink-3">{o.hint}</span>}
          </span>
          {value === o.id && <LuCheck className="size-4 text-primary-ink" aria-hidden />}
        </button>
      ))}
    </div>
  );
}

function Avatar({ name, size = "md" }: { name: string; size?: "md" | "sm" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-accent font-semibold text-on-accent",
        size === "md" ? "size-9 text-body" : "size-7 text-meta",
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

/* ---------------------------------------------------------------- amigos */

function FriendsTab({
  data,
  code,
  setCode,
  onChallenge,
}: {
  data: SocialState;
  code: string;
  setCode: (v: string) => void;
  onChallenge: (id: string) => void;
}) {
  const busy = useSocial((s) => s.busy);
  const clean = code.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 6);

  return (
    <div className="space-y-8">
      <form
        className="rounded-3xl border border-line bg-surface p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (clean.length !== 6) return;
          if (await act("adicionar", { code: clean }, "Pedido enviado")) setCode("");
        }}
      >
        <label htmlFor="codigo-amigo" className="font-semibold text-ink">
          Adicionar amigo
        </label>
        <p className="text-meta text-ink-2">Peça o código de amigo dele (fica no topo desta tela).</p>
        <div className="mt-3 flex gap-2">
          <Input
            id="codigo-amigo"
            value={clean}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Ex.: K7P2QA"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            className="tabular font-mono uppercase tracking-[0.15em]"
          />
          <Button type="submit" variant="primary" disabled={clean.length !== 6 || busy}>
            <LuUserPlus className="size-4" aria-hidden />
            Adicionar
          </Button>
        </div>
      </form>

      {data.incoming.length > 0 && (
        <section aria-labelledby="pedidos">
          <h2 id="pedidos" className="mb-3 text-lead font-semibold text-ink">
            Pedidos de amizade
          </h2>
          <ul className="space-y-2">
            {data.incoming.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-2xl border-2 border-accent bg-accent-soft px-4 py-3">
                <Avatar name={r.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink">{r.name}</span>
                  <span className="tabular block font-mono text-meta text-ink-3">{r.code}</span>
                </span>
                <Button size="sm" variant="primary" onClick={() => act("responder-amigo", { id: r.id, accept: true }, `Você e ${r.name} agora são amigos`)}>
                  Aceitar
                </Button>
                <Button size="sm" variant="ghost" aria-label={`Recusar ${r.name}`} onClick={() => act("responder-amigo", { id: r.id, accept: false })}>
                  <LuX className="size-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="lista-amigos">
        <h2 id="lista-amigos" className="mb-3 text-lead font-semibold text-ink">
          Seus amigos <span className="tabular ml-1 text-body font-medium text-ink-3">{data.friends.length}</span>
        </h2>
        {data.friends.length === 0 ? (
          <p className="rounded-3xl bg-surface-2/60 px-5 py-6 text-ink-2">Ainda ninguém por aqui. Envie seu código ou adicione o de um amigo.</p>
        ) : (
          <ul className="space-y-2">
            {data.friends.map((f) => (
              <li key={f.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
                <Avatar name={f.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink">{f.name}</span>
                  <span className="tabular block font-mono text-meta text-ink-3">{f.code}</span>
                </span>
                <Button size="sm" variant="primary" onClick={() => onChallenge(f.id)}>
                  <LuSwords className="size-3.5" aria-hidden />
                  Desafiar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Remover ${f.name} dos amigos`}
                  onClick={() =>
                    askConfirm({
                      title: `Remover ${f.name} dos amigos?`,
                      body: "As batalhas que já existem continuam no histórico.",
                      actionLabel: "Remover",
                      onConfirm: () => void act("remover-amigo", { user: f.id }),
                    })
                  }
                >
                  <LuUserMinus className="size-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.outgoing.length > 0 && (
        <section aria-labelledby="enviados">
          <h2 id="enviados" className="mb-3 text-meta font-semibold text-ink-2">
            Pedidos enviados
          </h2>
          <ul className="space-y-2">
            {data.outgoing.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-2xl border border-dashed border-line-strong px-4 py-2.5">
                <Avatar name={r.name} size="sm" />
                <span className="min-w-0 flex-1 truncate text-ink">{r.name}</span>
                <span className="text-meta text-ink-3">aguardando</span>
                <Button size="sm" variant="ghost" onClick={() => act("responder-amigo", { id: r.id, accept: false })}>
                  Cancelar
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- grupos */

function GroupsTab({
  data,
  onNew,
  onChallenge,
  onGoFriends,
}: {
  data: SocialState;
  onNew: () => void;
  onChallenge: (id: string) => void;
  onGoFriends: () => void;
}) {
  const [inviting, setInviting] = useState<Group | null>(null);
  const invites = data.groups.filter((g) => g.status === "convidado");
  const mine = data.groups.filter((g) => g.status === "membro");

  return (
    <div className="space-y-8">
      {data.friends.length > 0 ? (
        <Button variant="primary" className="h-12 w-full sm:w-auto" onClick={onNew}>
          <LuUsers className="size-4" aria-hidden />
          Criar grupo
        </Button>
      ) : (
        <EmptyState
          title="Grupos são feitos com amigos"
          body="Adicione amigos primeiro e depois junte todo mundo num grupo."
          action={
            <Button variant="primary" onClick={onGoFriends}>
              <LuUserPlus className="size-4" aria-hidden />
              Adicionar amigo
            </Button>
          }
        />
      )}

      {invites.length > 0 && (
        <section aria-labelledby="convites-grupo">
          <h2 id="convites-grupo" className="mb-3 text-lead font-semibold text-ink">
            Convites para grupos
          </h2>
          <ul className="space-y-2">
            {invites.map((g) => (
              <li key={g.id} className="rounded-2xl border-2 border-accent bg-accent-soft p-4">
                <p className="font-semibold text-ink">{g.name}</p>
                <p className="text-meta text-ink-2">
                  {g.members
                    .filter((m) => m.status === "membro")
                    .map((m) => m.name)
                    .join(", ")}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="primary" onClick={() => act("responder-grupo", { group: g.id, accept: true }, `Você entrou em ${g.name}`)}>
                    Entrar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => act("responder-grupo", { group: g.id, accept: false })}>
                    Recusar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {mine.length > 0 && (
        <section aria-labelledby="seus-grupos">
          <h2 id="seus-grupos" className="mb-3 text-lead font-semibold text-ink">
            Seus grupos
          </h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {mine.map((g) => (
              <li key={g.id} className="rounded-3xl border border-line bg-surface p-5">
                <h3 className="font-semibold text-ink">{g.name}</h3>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {g.members.map((m) => (
                    <li
                      key={m.id}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-meta",
                        m.status === "membro" ? "bg-surface-2 text-ink" : "border border-dashed border-line-strong text-ink-3",
                      )}
                    >
                      <Avatar name={m.name} size="sm" />
                      {m.id === data.me.id ? "Você" : m.name}
                      {m.status === "convidado" && " (convidado)"}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="primary" onClick={() => onChallenge(g.id)}>
                    <LuSwords className="size-3.5" aria-hidden />
                    Desafiar o grupo
                  </Button>
                  <Button size="sm" onClick={() => setInviting(g)}>
                    <LuUserPlus className="size-3.5" aria-hidden />
                    Convidar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      askConfirm({
                        title: `Sair de ${g.name}?`,
                        actionLabel: "Sair do grupo",
                        onConfirm: () => void act("sair-grupo", { group: g.id }, `Você saiu de ${g.name}`),
                      })
                    }
                  >
                    Sair
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {inviting && <GroupDialog data={data} group={inviting} onClose={() => setInviting(null)} />}
    </div>
  );
}

/** Criar grupo (sem `group`) ou convidar mais amigos para um grupo. */
function GroupDialog({ data, group, onClose }: { data: SocialState; group?: Group; onClose: () => void }) {
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const options = useMemo(
    () => data.friends.filter((f) => !group?.members.some((m) => m.id === f.id)),
    [data.friends, group],
  );
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const valid = picked.length > 0 && (group || name.trim().length > 0);

  const submit = async () => {
    setBusy(true);
    const ok = group
      ? await act("convidar-grupo", { group: group.id, members: picked }, "Convites enviados")
      : await act("criar-grupo", { name: name.trim(), members: picked }, "Grupo criado. Seus amigos receberam o convite.");
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={group ? `Convidar para ${group.name}` : "Criar grupo"}
      size="sm"
      footer={
        <div className="ml-auto flex gap-2">
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={!valid || busy} onClick={submit}>
            {group ? "Convidar" : "Criar grupo"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {!group && (
          <div>
            <label htmlFor="nome-grupo" className="mb-1.5 block text-meta font-semibold text-ink-2">
              Nome do grupo
            </label>
            <Input id="nome-grupo" data-autofocus value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Turma da faculdade" />
          </div>
        )}
        <div>
          <p className="mb-2 text-meta font-semibold text-ink-2">Amigos</p>
          {options.length === 0 ? (
            <p className="rounded-2xl bg-surface-2 p-4 text-ink-2">Todos os seus amigos já estão nesse grupo.</p>
          ) : (
            <ul className="max-h-64 space-y-1.5 overflow-y-auto scrollbar-thin">
              {options.map((f) => {
                const on = picked.includes(f.id);
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => toggle(f.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors",
                        on ? "border-primary bg-primary-soft" : "border-line hover:border-line-strong",
                      )}
                    >
                      <Avatar name={f.name} />
                      <span className="min-w-0 flex-1 truncate font-semibold text-ink">{f.name}</span>
                      <span className={cn("grid size-6 place-items-center rounded-lg border-2", on ? "border-primary bg-primary text-on-primary" : "border-line-strong")}>
                        {on && <LuCheck className="size-3.5" strokeWidth={3} aria-hidden />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
