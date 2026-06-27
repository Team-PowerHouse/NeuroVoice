import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import DemoModeBanner from "./components/DemoModeBanner";
import Dashboard from "./pages/Dashboard";
import AddChild from "./pages/AddChild";
import ChildProfiles from "./pages/ChildProfiles";
import ChildDetail from "./pages/ChildDetail";
import UploadBehavior from "./pages/UploadBehavior";
import BehaviorHistory from "./pages/BehaviorHistory";
import BehaviorDictionary from "./pages/BehaviorDictionary";
import LiveMonitoring from "./pages/LiveMonitoring";
import Settings from "./pages/Settings";
import CommunicationPassport from "./pages/CommunicationPassport";
import Analytics from "./pages/Analytics";
import Timeline from "./pages/Timeline";
import HospitalShareView from "./pages/HospitalShareView";

export default function App() {
  return (
    <Routes>
      {/* Standalone public route: simulates the read-only hospital share link, no sidebar */}
      <Route path="/share/:token" element={<HospitalShareView />} />

      <Route
        path="/*"
        element={
          <div className="app-shell">
            <Sidebar />
            <div className="main-area">
              <DemoModeBanner />
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/add-child" element={<AddChild />} />
                <Route path="/children" element={<ChildProfiles />} />
                <Route path="/children/:id" element={<ChildDetail />} />
                <Route path="/children/:id/passport" element={<CommunicationPassport />} />
                <Route path="/upload" element={<UploadBehavior />} />
                <Route path="/history" element={<BehaviorHistory />} />
                <Route path="/timeline" element={<Timeline />} />
                <Route path="/dictionary" element={<BehaviorDictionary />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/monitoring" element={<LiveMonitoring />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </div>
          </div>
        }
      />
    </Routes>
  );
}
