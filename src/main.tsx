import { createRoot } from "react-dom/client";
import "./lib/posthog";
import "./index.css";
import App from "./App";
createRoot(document.getElementById("root")!).render(<App />);
