"use client";

import { useId, useState } from "react";
import { LuMusic } from "react-icons/lu";
import type { TrainingPlan, Workspace } from "@/types/domain";
import { TRAINING_PLAN_ID } from "@/types/domain";
import { saveTrainingPlan } from "@/lib/store/app-store";
import { WorkspaceGate } from "@/components/layout/workspace-gate";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Page, PageHeader } from "@/components/ui/page";
import { Tabs } from "@/components/ui/tabs";
import { ExerciseList } from "./exercise-list";
import { SplitBuilder } from "./split-builder";
import { WorkoutToday } from "./workout-today";

type TabId = "today" | "split" | "exercises";

const EMPTY_PLAN: TrainingPlan = { id: TRAINING_PLAN_ID, spotifyUrl: null, youtubeUrl: null, split: {}, finishers: [], finisherDone: {} };

/** Aba própria de treino: treino do dia, divisão semanal e exercícios. */
export function TrainingPage() {
  return <WorkspaceGate>{(data) => <TrainingContent data={data} />}</WorkspaceGate>;
}

function TrainingContent({ data }: { data: Workspace }) {
  const [tab, setTab] = useState<TabId>("today");
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const plan = data.trainingPlans.find((p) => p.id === TRAINING_PLAN_ID) ?? EMPTY_PLAN;

  return (
    <Page wide>
      <PageHeader
        title="Treino"
        description="Divisão da semana, carga e repetições, cardio e o que fazer antes de ir embora."
        actions={
          <Button variant="ghost" onClick={() => setPlaylistOpen(true)}>
            <LuMusic className="size-4" aria-hidden />
            {plan.spotifyUrl || plan.youtubeUrl ? "Playlists" : "Adicionar playlist"}
          </Button>
        }
      />

      <Tabs
        label="Seções do treino"
        value={tab}
        onChange={setTab}
        items={[
          { value: "today", label: "Treino do dia" },
          { value: "split", label: "Divisão semanal" },
          { value: "exercises", label: "Exercícios", count: data.exercises.length },
        ]}
      />

      <div className="mt-6">
        {tab === "today" && <WorkoutToday data={data} plan={plan} onEditPlaylist={() => setPlaylistOpen(true)} />}
        {tab === "split" && <SplitBuilder data={data} plan={plan} />}
        {tab === "exercises" && <ExerciseList data={data} />}
      </div>

      {playlistOpen && <PlaylistForm plan={plan} onClose={() => setPlaylistOpen(false)} />}
    </Page>
  );
}

function PlaylistForm({ plan, onClose }: { plan: TrainingPlan; onClose: () => void }) {
  const [spotify, setSpotify] = useState(plan.spotifyUrl ?? "");
  const [youtube, setYoutube] = useState(plan.youtubeUrl ?? "");
  const ids = { spotify: useId(), youtube: useId() };
  const valid = (u: string) => !u.trim() || /^https?:\/\//i.test(u.trim());
  const ok = valid(spotify) && valid(youtube);
  const save = () => {
    if (!ok) return;
    saveTrainingPlan({ ...plan, spotifyUrl: spotify.trim() || null, youtubeUrl: youtube.trim() || null });
    onClose();
  };
  const hint = (u: string) => (valid(u) ? "Deixe vazio para abrir o app sem playlist." : "Use um link completo, começando com https://");
  return (
    <Modal
      open
      size="sm"
      onClose={onClose}
      title="Playlists de treino"
      description="O botão de música deixa você escolher entre Spotify e YouTube."
      footer={
        <div className="ml-auto flex gap-2">
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save} disabled={!ok}>
            Salvar
          </Button>
        </div>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label="Spotify" htmlFor={ids.spotify} hint={hint(spotify)}>
          <Input id={ids.spotify} data-autofocus value={spotify} onChange={(e) => setSpotify(e.target.value)} placeholder="https://open.spotify.com/playlist/…" />
        </Field>
        <Field label="YouTube" htmlFor={ids.youtube} hint={hint(youtube)}>
          <Input id={ids.youtube} value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="https://music.youtube.com/playlist?list=…" />
        </Field>
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}
