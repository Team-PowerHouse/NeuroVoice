import { createContext, useContext, useEffect, useRef, useState } from "react";
import { isDemoMode, setDemoMode, runAutoDemoTick, getChildren, seedDemoDataIfEmpty } from "../utils/storage";

const DemoModeContext = createContext(null);

const TICK_INTERVAL_MS = 6000;

export function DemoModeProvider({ children }) {
  const [active, setActive] = useState(() => isDemoMode());
  const [lastEvent, setLastEvent] = useState(null);
  const [tickCount, setTickCount] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (active) {
      seedDemoDataIfEmpty();
      if (getChildren().length === 0) return;
      intervalRef.current = setInterval(() => {
        const events = runAutoDemoTick();
        if (events && events.length > 0) {
          setLastEvent(events[0]);
          setTickCount((c) => c + 1);
        }
      }, TICK_INTERVAL_MS);
    }
    return () => clearInterval(intervalRef.current);
  }, [active]);

  function toggle() {
    setActive((prev) => {
      const next = !prev;
      setDemoMode(next);
      return next;
    });
  }

  function enable() {
    setDemoMode(true);
    setActive(true);
  }

  function disable() {
    setDemoMode(false);
    setActive(false);
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
