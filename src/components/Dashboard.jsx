import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
} from "framer-motion";
import {
  LogOut,
  Battery,
  Wrench,
  Package,
  Shield,
  Home,
  X,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import Overview from "./Overview";
import Inventory from "./Inventory";
import Sales from "./Sales";
import Service from "./Service";
import AdminPanel from "./AdminPanel";

const BTN = 48,
  GAP = 4,
  PAD = 8,
  STEP = BTN + GAP;
const restX = (i) => PAD + i * STEP;

function PillNav({ tabs, activeTab, onSelect }) {
  const activeIndex = Math.max(
    0,
    tabs.findIndex((t) => t.id === activeTab),
  );
  const last = Math.max(0, tabs.length - 1);
  const minX = restX(0);
  const maxX = restX(last);

  const containerRef = useRef(null);
  const dragging = useRef(false);
  const moved = useRef(false);
  const downX = useRef(0);
  const [hover, setHover] = useState(activeIndex);

  const xRaw = useMotionValue(restX(activeIndex));
  const x = useSpring(xRaw, { stiffness: 350, damping: 32, mass: 0.8 });
  const scaleRaw = useMotionValue(1);
  const scale = useSpring(scaleRaw, { stiffness: 500, damping: 24 });

  useEffect(() => {
    if (!dragging.current) xRaw.set(restX(activeIndex));
  }, [activeIndex]);

  const indexFromClientX = (clientX) => {
    const rect = containerRef.current.getBoundingClientRect();
    const raw = Math.min(maxX, Math.max(minX, clientX - rect.left - BTN / 2));
    return Math.min(last, Math.max(0, Math.round((raw - PAD) / STEP)));
  };

  const onPointerDown = (e) => {
    dragging.current = true;
    moved.current = false;
    downX.current = e.clientX;
    containerRef.current?.setPointerCapture(e.pointerId);
    const idx = indexFromClientX(e.clientX);
    setHover(idx);
    xRaw.set(restX(idx));
    scaleRaw.set(1.12);
  };

  const onPointerMove = (e) => {
    if (!dragging.current) return;
    if (!moved.current && Math.abs(e.clientX - downX.current) > 5)
      moved.current = true;
    if (!moved.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const raw = Math.min(maxX, Math.max(minX, e.clientX - rect.left - BTN / 2));
    xRaw.set(raw);
    setHover(Math.min(last, Math.max(0, Math.round((raw - PAD) / STEP))));
  };

  const endDrag = (e) => {
    if (!dragging.current) return;
    dragging.current = false;
    scaleRaw.set(1);
    const target = moved.current ? hover : indexFromClientX(e.clientX);
    xRaw.set(restX(target));
    setHover(target);
    onSelect(tabs[target].id);
    try {
      containerRef.current?.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const litIndex = dragging.current ? hover : activeIndex;

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 md:hidden">
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{ touchAction: "none" }}
        className="relative flex items-center gap-1 rounded-full bg-[var(--card)] border border-[var(--card-border)] shadow-lg px-2 py-2 select-none"
      >
        <motion.span
          aria-hidden="true"
          style={{ x, scale }}
          className="pointer-events-none absolute top-2 left-0 w-12 h-12 rounded-full bg-zinc-900 dark:bg-white shadow-md will-change-transform"
        />
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            aria-label={tab.name}
            aria-current={activeTab === tab.id ? "page" : undefined}
            className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full"
          >
            <tab.icon
              className={`w-5 h-5 transition-colors duration-200 ${
                litIndex === i
                  ? "text-white dark:text-zinc-900"
                  : "text-zinc-400 dark:text-zinc-500"
              }`}
            />
          </button>
        ))}
      </div>
    </nav>
  );
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("home");
  const [isAdmin, setIsAdmin] = useState(false);
  const [shopName, setShopName] = useState("Battery CRM");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const fetchInitialData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (profile) setIsAdmin(profile.role === "admin");
      }
      const { data: settings } = await supabase
        .from("shop_settings")
        .select("shop_name")
        .eq("id", 1)
        .single();
      if (settings) setShopName(settings.shop_name);
    };
    fetchInitialData();
  }, []);

  const handleLogout = async () => await supabase.auth.signOut();
  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setIsSidebarOpen(false);
  };

  let tabs = [
    { id: "home", name: "Home", icon: Home },
    { id: "sales", name: "Sales", icon: Battery },
    { id: "service", name: "Service", icon: Wrench },
    { id: "inventory", name: "Inventory", icon: Package },
  ];
  if (isAdmin) tabs.push({ id: "admin", name: "Admin", icon: Shield });

  const themeChip = (
    <button
      onClick={toggleTheme}
      className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--card)] border border-[var(--card-border)] shadow-sm text-zinc-900 dark:text-white transition-transform active:scale-95"
    >
      {theme === "dark" ? (
        <Sun className="w-5 h-5 text-amber-400" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-[var(--canvas)] p-3 md:p-4 flex flex-col md:flex-row gap-3 md:gap-4 relative transition-colors">
      {/* Mobile Top Bar — plain brand label + floating circular chips, no box */}
      <div className="md:hidden flex items-center justify-between px-1 py-2 mb-1 sticky top-0 z-30 bg-[var(--canvas)]">
        <h1 className="text-sm font-extrabold tracking-tight text-zinc-900 dark:text-white truncate pl-1">
          {shopName}
        </h1>
        <div className="flex items-center gap-2">
          {themeChip}
          <button
            onClick={handleLogout}
            aria-label="Logout"
            className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--card)] border border-[var(--card-border)] shadow-sm text-zinc-500 dark:text-zinc-400 transition-transform active:scale-95"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`glass-card p-6 flex flex-col gap-4 z-50 fixed top-0 left-0 h-full w-72 transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:static md:translate-x-0 md:w-64 md:h-auto md:min-h-[calc(100vh-2rem)] md:z-0 rounded-3xl`}
      >
        <div className="flex justify-between items-center w-full mb-8">
          <h1 className="text-lg font-extrabold tracking-tight leading-tight text-zinc-900 dark:text-white">
            {shopName}
          </h1>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-zinc-900 dark:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-2 w-full flex-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full text-sm font-semibold ${activeTab === tab.id ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5"}`}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 mt-auto text-zinc-600 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200 w-full text-sm font-semibold"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </aside>

      {/* Main Content Area — sits directly on the canvas, no wrapper card */}
      <main className="flex-1 min-w-0 p-2 pb-28 md:p-6">
        <div className="hidden md:flex justify-end mb-4">{themeChip}</div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === "home" && <Overview shopName={shopName} />}
            {activeTab === "sales" && <Sales isAdmin={isAdmin} />}
            {activeTab === "service" && <Service isAdmin={isAdmin} />}
            {activeTab === "inventory" && <Inventory isAdmin={isAdmin} />}
            {activeTab === "admin" && isAdmin && <AdminPanel />}
          </motion.div>
        </AnimatePresence>
      </main>

      <PillNav tabs={tabs} activeTab={activeTab} onSelect={setActiveTab} />
    </div>
  );
}
