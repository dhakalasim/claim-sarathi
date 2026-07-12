import { Navigate, Route, Routes } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { LoginPage } from "./pages/LoginPage";
import { ClaimListPage } from "./pages/policyholder/ClaimListPage";
import { ClaimDetailPage } from "./pages/policyholder/ClaimDetailPage";
import { ClaimIntakeForm } from "./pages/policyholder/ClaimIntakeForm";
import { BranchQueuePage } from "./pages/branch/BranchQueuePage";
import { SurveyorQueuePage } from "./pages/surveyor/SurveyorQueuePage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";

function NavBar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  if (!user) return null;

  const homeLabelByRole: Record<typeof user.role, string> = {
    POLICYHOLDER: t("nav.myClaims"),
    BRANCH_OFFICER: t("nav.branchQueue"),
    SURVEYOR: t("nav.surveyorQueue"),
    ADMIN: t("nav.adminDashboard"),
  };

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
      <Link to="/" className="text-sm font-semibold text-gray-900">
        {t("app.title")}
      </Link>
      <nav className="flex items-center gap-3 text-sm text-gray-600">
        <span>{homeLabelByRole[user.role]}</span>
        <LanguageSwitcher />
        <button onClick={logout} className="text-brand-600 hover:underline">
          {t("nav.logout")}
        </button>
      </nav>
    </header>
  );
}

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case "POLICYHOLDER":
      return <ClaimListPage />;
    case "BRANCH_OFFICER":
      return <BranchQueuePage />;
    case "SURVEYOR":
      return <SurveyorQueuePage />;
    case "ADMIN":
      return <AdminDashboardPage />;
  }
}

export function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomeRedirect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/claims/new"
            element={
              <ProtectedRoute allowedRoles={["POLICYHOLDER"]}>
                <ClaimIntakeForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/claims/:id"
            element={
              <ProtectedRoute>
                <ClaimDetailPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </AuthProvider>
  );
}
