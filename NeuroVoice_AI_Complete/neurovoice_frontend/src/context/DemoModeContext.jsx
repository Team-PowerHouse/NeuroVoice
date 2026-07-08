import { createContext, useContext, useEffect, useRef, useState } from "react";
import { fetchDemoMode, setDemoModeRemote, runDemoTick } from "../services/api";

const DemoModeContext = createContext(null);

const TICK_INTERVAL_MS = 6000;

export function DemoModeProvider({ children }) {
  const [active, setActive] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const [tickCount, setTickCount] = useState(0);
  const intervalRef = useRef(null);

  // Load initial demo mode state from backend
  useEffect(() => {
    fetchDemoMode()
      .then((enabled) => setActive(Boolean(enabled)))
      .catch(() => setActive(false));
  }, []);

  useEffect(() => {
    if (active) {
      intervalRef.current = setInterval(async () => {
        try {
          const events = await runDemoTick();
          if (events && events.length > 0) {
            setLastEvent(events[0]);
            setTickCount((c) => c + 1);
          }
        } catch (err) {
          console.error("Demo tick failed:", err);
        }
      }, TICK_INTERVAL_MS);
    }
    return () => clearInterval(intervalRef.current);
  }, [active]);

  async function toggle() {
    const next = !active;
    setActive(next);
    try {
      await setDemoModeRemote(next);
    } catch (err) {
      console.error("Failed to sync demo mode:", err);
    }
  }

  async function enable() {
    setActive(true);
    try { await setDemoModeRemote(true); } catch {}
  }

  async function disable() {
    setActive(false);
    try { await setDemoModeRemote(false); } catch {}
  }

  return (
    <DemoModeContext.Provider value={{ active, toggle, enable, disable, lastEvent, tickCount }}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  const ctx = useContext(DemoModeContext);
  if (!ctx) throw new Error("useDemoMode must be used within DemoModeProvider");
  return ctx;
}
