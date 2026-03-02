import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { HomeGrid } from "./pages/HomeGrid";
import { Settings } from "./pages/Settings";
import { useSpatialNavigation } from "./hooks/useSpatialNavigation";
import "./index.css";

function App() {
  const [activeTab, setActiveTab] = useState("home");

  // Ativa a escuta global de Gamepads e Teclado 
  useSpatialNavigation();

  return (
    <main className="flex w-screen h-screen bg-black text-white overflow-hidden font-sans">
      {/* Cinematic Abstract Background Blobs */}
      <div className="absolute top-1/4 -right-1/4 w-[120vw] h-[120vh] bg-purple-900/20 rounded-full blur-[200px] -z-10 pointer-events-none" />
      <div className="absolute -bottom-1/4 -left-1/4 w-[100vw] h-[100vh] bg-blue-900/20 rounded-full blur-[200px] -z-10 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vh] bg-fuchsia-900/10 rounded-full blur-[250px] -z-10 pointer-events-none" />

      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <section className="flex-1 h-full z-10 w-full overflow-hidden relative pl-20">
        {(activeTab === "home" || activeTab === "web" || activeTab === "apps") && <HomeGrid activeTab={activeTab} />}
        {activeTab === "settings" && <Settings />}
      </section>
    </main>
  );
}

export default App;
