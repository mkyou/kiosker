import { useEffect, useState } from "react";
import { HomeGrid } from "./pages/HomeGrid";
import { Settings } from "./pages/Settings";
import { BrowserPicker } from "./components/BrowserPicker";
import { Toolbar } from "./components/Toolbar";
import { useSpatialNavigation } from "./hooks/useSpatialNavigation";
import { invoke } from "@tauri-apps/api/core";
import "./index.css";

function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [preferredBrowser, setPreferredBrowser] = useState<string | null>(null);
  const [checkingBrowser, setCheckingBrowser] = useState(true);

  // Checks if we have an initial preference
  useEffect(() => {
     const checkBrowser = async () => {
         try {
             const setting = await invoke<string | null>("get_setting", { key: "preferred_browser" });
             setPreferredBrowser(setting);
         } catch (e) {
             console.error("Failed to check browser setting:", e);
         } finally {
             setCheckingBrowser(false);
         }
     }
     checkBrowser();
  }, []);

  // Ativa a escuta global de Gamepads e Teclado 
  useSpatialNavigation();

  return (
    <main className="flex flex-col w-screen h-screen bg-dracula-bg text-dracula-fg overflow-hidden font-sans relative">
      <Toolbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <section className="flex-1 h-full z-10 w-full overflow-hidden relative pt-24 px-12 md:px-20">
        {activeTab === "home" && <HomeGrid activeTab={activeTab} />}
        {activeTab === "settings" && <Settings />}
      </section>

      {!checkingBrowser && !preferredBrowser && (
          <BrowserPicker onComplete={(browser) => setPreferredBrowser(browser)} />
      )}
    </main>
  );
}

export default App;
