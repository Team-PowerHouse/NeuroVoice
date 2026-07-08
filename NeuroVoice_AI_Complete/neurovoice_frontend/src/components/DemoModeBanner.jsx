import { useDemoMode } from "../context/DemoModeContext.jsx";

export default function DemoModeBanner() {
  const { active, lastEvent, disable } = useDemoMode();

  if (!active) return null;

  return (
    <div className="demo-banner">
      <span className="demo-banner-dot" />
      <span className="demo-banner-text">
        <strong>Demo Mode is live.</strong>{" "}
        {lastEvent
          ? `Just generated: "${lastEvent.behaviorLabel}" → ${lastEvent.need} for ${lastEvent.childName}.`
          : "Auto-generating behavior samples and predictions every few seconds."}
      </span>
      <button className="demo-banner-close" onClick={disable} aria-label="Turn off demo mode">
        Turn off
      </button>
    </div>
  );
}
