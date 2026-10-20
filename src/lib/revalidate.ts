import { revalidatePath } from "next/cache";

/** Every page shows the tree (counts, leaves, risk), so a change refreshes the whole layout. */
export function revalidateAll() {
  revalidatePath("/", "layout");
}
