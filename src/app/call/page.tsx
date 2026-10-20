import { CallMock } from "@/components/CallMock";
import { requireUser } from "@/lib/auth";
import { DEMO_CALL } from "@/lib/demo-call";

export const dynamic = "force-dynamic";

export default async function CallPage() {
  await requireUser();
  return <CallMock audioUrl={DEMO_CALL.audioUrl} caller={{ name: DEMO_CALL.with, role: DEMO_CALL.role }} />;
}
