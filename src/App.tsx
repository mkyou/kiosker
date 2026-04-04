import { useEffect, useState } from "react";
import { HomeGrid, KioskerItem } from "./pages/HomeGrid";
import { Settings } from "./pages/Settings";
import { BrowserPicker } from "./components/BrowserPicker";
import { Toolbar } from "./components/Toolbar";
import { VirtualKeyboard } from "./components/VirtualKeyboard";
import { useSpatialNavigation } from "./hooks/useSpatialNavigation";
import { invoke } from "@tauri-apps/api/core";
import "./index.css";

function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [preferredBrowser, setPreferredBrowser] = useState<string | null>(null);
  const [checkingBrowser, setCheckingBrowser] = useState(true);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const handleKeyboardInput = (key: string) => {
    const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
    if (!(active instanceof HTMLInputElement) && !(active instanceof HTMLTextAreaElement)) return;

    const proto = active instanceof HTMLInputElement
      ? window.HTMLInputElement.prototype
      : window.HTMLTextAreaElement.prototype;
    const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;

    const start = active.selectionStart ?? active.value.length;
    const end   = active.selectionEnd   ?? active.value.length;
    let newValue = active.value;
    let newCursor = start;

    if (key === 'Backspace') {
      if (start !== end) {
        newValue  = newValue.slice(0, start) + newValue.slice(end);
        newCursor = start;
      } else if (start > 0) {
        newValue  = newValue.slice(0, start - 1) + newValue.slice(start);
        newCursor = start - 1;
      }
    } else if (key === 'Enter') {
      active.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      return;
    } else {
      newValue  = newValue.slice(0, start) + key + newValue.slice(end);
      newCursor = start + key.length;
    }

    nativeSetter?.call(active, newValue);
    active.dispatchEvent(new Event('input', { bubbles: true }));
    active.setSelectionRange(newCursor, newCursor);
  };

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        setIsKeyboardVisible(true);
      }
    };
    const handleFocusOut = (e: FocusEvent) => {
      const next = e.relatedTarget as Element | null;
      if (!(next instanceof HTMLInputElement) && !(next instanceof HTMLTextAreaElement)) {
        setIsKeyboardVisible(false);
      }
    };
    window.addEventListener('focusin',  handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);
    return () => {
      window.removeEventListener('focusin',  handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

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

  const [items, setItems] = useState<KioskerItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [activeTargets, setActiveTargets] = useState<string[]>([]);

  const fetchItems = async () => {
    try {
      const result = await invoke<KioskerItem[]>("get_items");
      setItems(result);
    } catch (e) {
      console.error("Failed to fetch items:", e);
    } finally {
      setLoadingItems(false);
    }
  };

  const refreshActiveTargets = async () => {
    try {
      const targets = await invoke<string[]>("get_active_targets");
      setActiveTargets(targets);
    } catch (e) {
      console.error("Failed to poll active targets", e);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    refreshActiveTargets();
    const interval = setInterval(refreshActiveTargets, 3000);
    return () => clearInterval(interval);
  }, []);

  // Ativa a escuta global de Gamepads e Teclado
  useSpatialNavigation(activeTargets.length > 0);

  return (
    <>
      <main className="flex flex-col w-screen h-screen bg-dracula-bg text-dracula-fg overflow-hidden font-sans relative">
        <Toolbar activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="flex-1 h-full z-10 w-full overflow-hidden relative pt-24 px-12 md:px-20">
          <section className={`absolute inset-0 pt-24 px-12 md:px-20 transition-all duration-500 ${activeTab === "home" ? "opacity-100 translate-y-0 z-20" : "opacity-0 translate-y-4 pointer-events-none z-10"}`}>
            <HomeGrid items={items} loading={loadingItems} onRefresh={fetchItems} activeTargets={activeTargets} onRefreshTargets={refreshActiveTargets} />
          </section>

          <section className={`absolute inset-0 pt-24 px-12 md:px-20 transition-all duration-500 ${activeTab === "settings" ? "opacity-100 translate-y-0 z-20" : "opacity-0 translate-y-4 pointer-events-none z-10"}`}>
            <Settings />
          </section>
        </div>

        {!checkingBrowser && !preferredBrowser && (
            <BrowserPicker onComplete={(browser) => setPreferredBrowser(browser)} />
        )}
      </main>
      {isKeyboardVisible && (
        <VirtualKeyboard
          onKeyPress={handleKeyboardInput}
          onClose={() => setIsKeyboardVisible(false)}
        />
      )}
    </>
  );
}

export default App;
