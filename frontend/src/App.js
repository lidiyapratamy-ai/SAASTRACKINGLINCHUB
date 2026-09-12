import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AppLayout from "./components/AppLayout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import ProjectPage from "./pages/ProjectPage";
import ProjectAnalyst from "./pages/ProjectAnalyst";
import CandidateInterview from "./pages/CandidateInterview";
import CandidateOJT from "./pages/CandidateOJT";
import CandidatePKWT from "./pages/CandidatePKWT";
import BillingPricing from "./pages/BillingPricing";
import BillingInvoices from "./pages/BillingInvoices";
import BillingCashflow from "./pages/BillingCashflow";
import Analyst from "./pages/Analyst";
import Settings from "./pages/Settings";

import ClientDashboard from "./pages/ClientDashboard";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center text-[color:var(--ink-3)] font-mono-ed text-[12px] uppercase tracking-widest">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "client") return <Navigate to="/client" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function ClientOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center text-[color:var(--ink-3)] font-mono-ed text-[12px] uppercase tracking-widest">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "client") return <Navigate to="/app/project" replace />;
  return children;
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ style: { fontFamily: "Manrope, sans-serif" } }} />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/app" element={<Navigate to="/app/project" replace />} />
            <Route path="/client" element={<ClientOnly><ClientDashboard /></ClientOnly>} />
            <Route path="/app/project" element={<Protected><ProjectPage /></Protected>} />
            <Route path="/app/project/analyst" element={<Protected><ProjectAnalyst /></Protected>} />
            <Route path="/app/candidate/interview" element={<Protected><CandidateInterview /></Protected>} />
            <Route path="/app/candidate/ojt" element={<Protected><CandidateOJT /></Protected>} />
            <Route path="/app/candidate/pkwt" element={<Protected><CandidatePKWT /></Protected>} />
            <Route path="/app/billing/pricing" element={<Protected><BillingPricing /></Protected>} />
            <Route path="/app/billing/invoices" element={<Protected><BillingInvoices /></Protected>} />
            <Route path="/app/billing/cashflow" element={<Protected><BillingCashflow /></Protected>} />
            <Route path="/app/analyst" element={<Protected><Analyst /></Protected>} />
            <Route path="/app/settings" element={<Protected><Settings /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
