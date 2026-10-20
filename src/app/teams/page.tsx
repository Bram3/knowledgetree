import { TeamsMock } from "@/components/TeamsMock";
import { teamsReactions } from "@/lib/leaf-actions";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  // The 🍃 reactions come from the stored leaves, so they survive a reload.
  return <TeamsMock reactions={await teamsReactions()} />;
}
