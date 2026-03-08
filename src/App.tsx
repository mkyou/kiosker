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

  const [items, setItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  const fetchItems = async () => {
    try {
      const result = await invoke<any[]>("get_items");
      setItems(result);
    } catch (e) {
      console.error("Failed to fetch items:", e);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Ativa a escuta global de Gamepads e Teclado 
  useSpatialNavigation();

  return (
    <main className="flex flex-col w-screen h-screen bg-dracula-bg text-dracula-fg overflow-hidden font-sans relative">
      <Toolbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 h-full z-10 w-full overflow-hidden relative pt-24 px-12 md:px-20">
        <section className={`absolute inset-0 pt-24 px-12 md:px-20 transition-all duration-500 ${activeTab === "home" ? "opacity-100 translate-y-0 z-20" : "opacity-0 translate-y-4 pointer-events-none z-10"}`}>
          <HomeGrid items={items} loading={loadingItems} onRefresh={fetchItems} />
        </section>
        
        <section className={`absolute inset-0 pt-24 px-12 md:px-20 transition-all duration-500 ${activeTab === "settings" ? "opacity-100 translate-y-0 z-20" : "opacity-0 translate-y-4 pointer-events-none z-10"}`}>
          <Settings />
        </section>
      </div>

      {!checkingBrowser && !preferredBrowser && (
          <BrowserPicker onComplete={(browser) => setPreferredBrowser(browser)} />
      )}
    </main>
  );
}

export default App;
