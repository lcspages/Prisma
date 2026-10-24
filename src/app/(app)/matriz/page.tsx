import type { Metadata } from "next";
import { MatrixBoard } from "@/features/matrix/components/matrix-board";

export const metadata: Metadata = { title: "Matriz" };

export default function Page() {
  return <MatrixBoard />;
}
