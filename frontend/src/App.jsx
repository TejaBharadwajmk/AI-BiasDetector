import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import EngineerPortal  from "./pages/EngineerPortal";
import CommunityPortal from "./pages/CommunityPortal";
import Dashboard       from "./pages/Dashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main engineer portal — upload + audit flow */}
        <Route path="/"                   element={<EngineerPortal />} />

        {/* Dashboard — can be opened with or without an auditId */}
        <Route path="/dashboard"          element={<Dashboard />} />
        <Route path="/dashboard/:auditId" element={<DashboardWithParams />} />

        {/* Community unfairness report portal */}
        <Route path="/community"          element={<CommunityPortal />} />

        {/* Catch-all → redirect home */}
        <Route path="*"                   element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// Pulls auditId from URL params and passes it to Dashboard
import { useParams } from "react-router-dom";
function DashboardWithParams() {
  const { auditId } = useParams();
  return <Dashboard auditId={auditId} />;
}