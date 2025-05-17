import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { DifficultyProvider } from "./contexts/DifficultyContext";

createRoot(document.getElementById("root")!).render(
  <DifficultyProvider>
    <App />
  </DifficultyProvider>
);
