import type { Metadata } from "next";
import InviteLanding from "./InviteLanding";

// The token is in the URL, so never send it onward as a referrer and keep the page out of search.
export const metadata: Metadata = {
  title: "An invitation to mentor on Concord",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function MentorInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <InviteLanding token={token} />;
}
