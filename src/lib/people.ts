/**
 * Display data for avatars and names: safe to ship to the browser. Emails, roles and customer
 * assignments stay server-side in seed.ts, which builds the full Person from these entries.
 */
export type PersonCard = { id: string; name: string; initials: string; color: string };

export const PEOPLE: PersonCard[] = [
  { id: "lena", name: "Lena Vermeulen", initials: "LV", color: "bg-[#001c52]" },
  { id: "sofie", name: "Sofie De Smet", initials: "SD", color: "bg-[#f1002f]" },
  { id: "jonas", name: "Jonas Becker", initials: "JB", color: "bg-[#006dd8]" },
  { id: "marta", name: "Marta Kowalski", initials: "MK", color: "bg-[#f28f29]" },
  { id: "pieter", name: "Pieter Janssens", initials: "PJ", color: "bg-[#009559]" },
  { id: "amelie", name: "Amélie Dubois", initials: "AD", color: "bg-[#9051e1]" },
  { id: "tom", name: "Tom Verhaeghe", initials: "TV", color: "bg-[#737476]" },
];

export function personCard(id: string | null | undefined): PersonCard | undefined {
  return PEOPLE.find((p) => p.id === id);
}
