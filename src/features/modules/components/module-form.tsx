"use client";

import { useId, useState } from "react";
import type { Module, ModuleColor, ModuleIcon, ModuleTemplate } from "@/types/domain";
import { createModule, updateModule } from "@/lib/store/app-store";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { MODULE_COLORS, MODULE_ICONS } from "../lib/appearance";
import { MODULE_TEMPLATES } from "../lib/templates";

/** Criar (sem `module`) ou editar um módulo. */
export function ModuleForm({
  module,
  onClose,
  onCreated,
}: {
  module?: Module;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const [name, setName] = useState(module?.name ?? "");
  const [template, setTemplate] = useState<ModuleTemplate>(module?.template ?? "study");
  const def = MODULE_TEMPLATES.find((t) => t.id === template)!;
  const [color, setColor] = useState<ModuleColor>(module?.color ?? def.defaultColor);
  const [icon, setIcon] = useState<ModuleIcon>(module?.icon ?? def.defaultIcon);
  const [touched, setTouched] = useState(Boolean(module));
  const ids = { name: useId() };

  const pickTemplate = (t: ModuleTemplate) => {
    setTemplate(t);
    if (!touched) {
      const d = MODULE_TEMPLATES.find((x) => x.id === t)!;
      setColor(d.defaultColor);
      setIcon(d.defaultIcon);
    }
  };

  const submit = () => {
    if (!name.trim()) return;
    if (module) {
      updateModule({ ...module, name: name.trim(), color, icon });
      onClose();
    } else {
      const id = createModule({ name, color, icon, template });
      onClose();
      onCreated?.(id);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={module ? "Editar módulo" : "Novo módulo"}
      description={module ? undefined : "Uma área da sua vida, com tarefas, hábitos, anotações e metas."}
      footer={
        <div className="ml-auto flex gap-2">
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={submit} disabled={!name.trim()}>
            {module ? "Salvar" : "Criar módulo"}
          </Button>
        </div>
      }
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="Nome" htmlFor={ids.name}>
          <Input id={ids.name} data-autofocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Faculdade" maxLength={60} />
        </Field>

        {!module && (
          <fieldset>
            <legend className="mb-1.5 text-meta font-semibold text-ink-2">Modelo</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {MODULE_TEMPLATES.map((t) => {
                const Icon = MODULE_ICONS[t.defaultIcon];
                const selected = template === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => pickTemplate(t.id)}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border p-3 text-left transition-colors",
                      selected ? "border-primary bg-primary-soft" : "border-line hover:border-line-strong",
                    )}
                  >
                    <Icon className="mt-0.5 size-5 shrink-0 text-ink-2" aria-hidden />
                    <span>
                      <span className="block font-semibold text-ink">{t.name}</span>
                      <span className="text-meta text-ink-2">{t.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend className="mb-1.5 text-meta font-semibold text-ink-2">Cor</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(MODULE_COLORS) as ModuleColor[]).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={color === c}
                aria-label={MODULE_COLORS[c].label}
                onClick={() => {
                  setColor(c);
                  setTouched(true);
                }}
                className={cn(
                  "size-9 rounded-full ring-offset-2 ring-offset-surface transition-shadow",
                  color === c ? "ring-2 ring-ink" : "hover:ring-2 hover:ring-line-strong",
                )}
                style={{ backgroundColor: MODULE_COLORS[c].hex }}
              />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1.5 text-meta font-semibold text-ink-2">Ícone</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(MODULE_ICONS) as ModuleIcon[]).map((i) => {
              const Icon = MODULE_ICONS[i];
              return (
                <button
                  key={i}
                  type="button"
                  aria-pressed={icon === i}
                  aria-label={`Ícone ${i}`}
                  onClick={() => {
                    setIcon(i);
                    setTouched(true);
                  }}
                  className={cn(
                    "grid size-10 place-items-center rounded-xl border transition-colors",
                    icon === i ? "border-transparent text-[#141414]" : "border-line text-ink-2 hover:border-line-strong",
                  )}
                  style={icon === i ? { backgroundColor: MODULE_COLORS[color].hex } : undefined}
                >
                  <Icon className="size-[18px]" aria-hidden />
                </button>
              );
            })}
          </div>
        </fieldset>

        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}
