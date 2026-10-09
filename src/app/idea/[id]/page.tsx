import { Suspense } from "react";
import { IdeaView } from "@/components/idea-view";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<p>Opening idea…</p>}>
      <IdeaView key={id} id={id} />
    </Suspense>
  );
}
