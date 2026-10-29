import { createRoot, hydrateRoot } from "react-dom/client";
import PublicApp, { type PublicPageData } from "./PublicApp";
import "./index.css";

const root = document.getElementById("root")!;
if (window.location.pathname === "/") {
  const initial = document.getElementById("public-page-data");
  const data: PublicPageData = initial
    ? JSON.parse(initial.textContent!)
    : { fetchedAt: Date.now() };
  if (initial) hydrateRoot(root, <PublicApp {...data} />);
  else createRoot(root).render(<PublicApp {...data} />);
} else {
  // Portal routes retain their existing authentication and client-side router.
  void import("./App").then(({ default: App }) => createRoot(root).render(<App />));
}
