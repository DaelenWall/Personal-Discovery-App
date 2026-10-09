"use client";

import { useNavigation } from "./navigation";
import { Home } from "./home";
import { SessionView } from "./session-view";
import { IdeaView } from "./idea-view";
import { Library } from "./library";
import { Knowledge } from "./knowledge";
import { Settings } from "./settings";
import { Ingest } from "./ingest";
import Link from "./navigation";

export function PhoneApp() {
  const { pathname } = useNavigation();
  if (pathname === "/") return <Home />;
  if (pathname === "/library") return <Library />;
  if (pathname === "/knowledge") return <Knowledge />;
  if (pathname === "/settings") return <Settings />;
  if (pathname === "/ingest") return <Ingest />;
  const session = pathname.match(/^\/session\/([^/]+)$/);
  if (session) return <SessionView key={session[1]} id={session[1]} />;
  const idea = pathname.match(/^\/idea\/([^/]+)$/);
  if (idea) return <IdeaView key={idea[1]} id={idea[1]} />;
  return (
    <div className="empty-state">
      <h1>Page not found</h1>
      <Link href="/">Back to discovery</Link>
    </div>
  );
}
