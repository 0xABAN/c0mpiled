import { AppHeader } from "@/frontend/components/shell/app-header";
import { Landing } from "@/frontend/features/marketing/landing";
import { getViewer } from "@/frontend/lib/api";

/** The public homepage stays reachable even when an account is signed in. */
export default async function Home() {
  const viewer = await getViewer();

  return (
    <>
      <AppHeader viewer={viewer} />
      <main id="main-content" tabIndex={-1}>
        <Landing />
      </main>
    </>
  );
}
