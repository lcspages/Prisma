"use client";

import { useRef, useState } from "react";

/**
 * Área que recebe algo arrastado (HTML5 drag-and-drop).
 * `type` separa o que pode cair aqui (ex.: tarefas, blocos de treino).
 */
export function useDropZone(type: string, onDropItem: (id: string) => void) {
  const [isOver, setIsOver] = useState(false);
  const depth = useRef(0);

  const accepts = (e: React.DragEvent) => e.dataTransfer.types.includes(type);

  return {
    isOver,
    props: {
      onDragEnter: (e: React.DragEvent) => {
        if (!accepts(e)) return;
        depth.current += 1;
        setIsOver(true);
      },
      onDragLeave: (e: React.DragEvent) => {
        if (!accepts(e)) return;
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setIsOver(false);
      },
      onDragOver: (e: React.DragEvent) => {
        if (!accepts(e)) return;
        e.preventDefault();
        // O efeito precisa ser compatível com o que a origem permite, senão o navegador recusa a soltura.
        e.dataTransfer.dropEffect = e.dataTransfer.effectAllowed === "copy" ? "copy" : "move";
      },
      onDrop: (e: React.DragEvent) => {
        if (!accepts(e)) return;
        e.preventDefault();
        depth.current = 0;
        setIsOver(false);
        const id = e.dataTransfer.getData(type);
        if (id) onDropItem(id);
      },
    },
  };
}
