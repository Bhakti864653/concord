import { redirect } from "next/navigation";

// Notes now live as a section on the "Our Plan" page (see journey/page.tsx)
// rather than its own tab - this route is kept, per the 2026-09 redesign,
// so old links/bookmarks still work, it just forwards.
export default async function NotesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/match/${id}/journey`);
}
