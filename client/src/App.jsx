import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { PageSpinner } from './components/ui/index.js';
import { LEARNER_ROLES, ROLES } from './lib/roles.js';

import PublicLayout from './layouts/PublicLayout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import OrgLayout from './layouts/OrgLayout.jsx';
import LearnerLayout from './layouts/LearnerLayout.jsx';

import ProtectedRoute from './routes/ProtectedRoute.jsx';
import RoleRoute from './routes/RoleRoute.jsx';
import GuestRoute from './routes/GuestRoute.jsx';
import RequireOrg from './routes/RequireOrg.jsx';

const Landing = lazy(() => import('./pages/public/Landing.jsx'));
const UiKitPreview = lazy(() => import('./pages/public/UiKitPreview.jsx'));
const Login = lazy(() => import('./pages/public/Login.jsx'));
const Register = lazy(() => import('./pages/public/Register.jsx'));
const RegisterOrg = lazy(() => import('./pages/public/RegisterOrg.jsx'));
const JoinInvite = lazy(() => import('./pages/public/JoinInvite.jsx'));
const Catalogue = lazy(() => import('./pages/public/Catalogue.jsx'));
const ProgrammeDetail = lazy(() => import('./pages/public/ProgrammeDetail.jsx'));
const NotFound = lazy(() => import('./pages/public/NotFound.jsx'));

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'));
const Organizations = lazy(() => import('./pages/admin/Organizations.jsx'));
const OrganizationDetail = lazy(() => import('./pages/admin/OrganizationDetail.jsx'));
const OrganizationEditor = lazy(() => import('./pages/admin/OrganizationEditor.jsx'));
const ProgrammesList = lazy(() => import('./pages/admin/ProgrammesList.jsx'));
const ProgrammeEditor = lazy(() => import('./pages/admin/ProgrammeEditor.jsx'));
const ProgrammeView = lazy(() => import('./pages/admin/ProgrammeView.jsx'));
const ProgrammeFields = lazy(() => import('./pages/admin/ProgrammeFields.jsx'));
const Categories = lazy(() => import('./pages/admin/Categories.jsx'));
const Learners = lazy(() => import('./pages/admin/Learners.jsx'));
const LearnerDetail = lazy(() => import('./pages/admin/LearnerDetail.jsx'));
const Recommendations = lazy(() => import('./pages/admin/Recommendations.jsx'));
const RecommendationReview = lazy(() => import('./pages/admin/RecommendationReview.jsx'));
const AdminEnrollments = lazy(() => import('./pages/admin/AdminEnrollments.jsx'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports.jsx'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings.jsx'));
const AccountSettings = lazy(() => import('./features/account/AccountSettings.jsx'));

const OrgSetup = lazy(() => import('./pages/org/OrgSetup.jsx'));
const OrgDashboard = lazy(() => import('./pages/org/OrgDashboard.jsx'));
const OrganizationSettings = lazy(() => import('./pages/org/OrganizationSettings.jsx'));
const InviteLinks = lazy(() => import('./pages/org/InviteLinks.jsx'));
const Employees = lazy(() => import('./pages/org/Employees.jsx'));
const EmployeeDetail = lazy(() => import('./pages/org/EmployeeDetail.jsx'));
const OrgEnrollments = lazy(() => import('./pages/org/OrgEnrollments.jsx'));
const OrgReports = lazy(() => import('./pages/org/OrgReports.jsx'));

const LearnerDashboard = lazy(() => import('./pages/learner/LearnerDashboard.jsx'));
const LearnerProgrammes = lazy(() => import('./pages/learner/LearnerProgrammes.jsx'));
const LearnerProgrammeDetail = lazy(() => import('./pages/learner/LearnerProgrammeDetail.jsx'));
const MyProfile = lazy(() => import('./pages/learner/MyProfile.jsx'));
const MyPathway = lazy(() => import('./pages/learner/MyPathway.jsx'));
const MyLearning = lazy(() => import('./pages/learner/MyLearning.jsx'));

/** Route table (docs/09). Unknown paths inside a role area show an in-layout 404. */
export default function App() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        {/* Public */}
        <Route element={<PublicLayout />}>
          <Route index element={<Landing />} />
          {/* Developer-only component gallery */}
          {import.meta.env.DEV && <Route path="ui-kit" element={<UiKitPreview />} />}
          <Route path="programmes" element={<Catalogue />} />
          <Route path="programmes/:id" element={<ProgrammeDetail />} />
          <Route element={<GuestRoute />}>
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="register-organization" element={<RegisterOrg />} />
            <Route path="join/:token" element={<JoinInvite />} />
          </Route>
        </Route>

        {/* Authenticated role areas */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="admin"
            element={
              <RoleRoute roles={[ROLES.C2B_ADMIN]}>
                <AdminLayout />
              </RoleRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="organizations" element={<Organizations />} />
            <Route path="organizations/new" element={<OrganizationEditor />} />
            <Route path="organizations/:id" element={<OrganizationDetail />} />
            <Route path="organizations/:id/edit" element={<OrganizationEditor />} />
            <Route path="programmes" element={<ProgrammesList />} />
            <Route path="programmes/new" element={<ProgrammeEditor />} />
            <Route path="programmes/:id" element={<ProgrammeView />} />
            <Route path="programmes/:id/edit" element={<ProgrammeEditor />} />
            <Route path="programme-fields" element={<ProgrammeFields />} />
            <Route path="categories" element={<Categories />} />
            <Route path="learners" element={<Learners />} />
            <Route path="learners/:id" element={<LearnerDetail />} />
            <Route path="recommendations" element={<Recommendations />} />
            <Route path="recommendations/:id" element={<RecommendationReview />} />
            <Route path="enrollments" element={<AdminEnrollments />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="*" element={<NotFound inApp />} />
          </Route>

          <Route
            path="org"
            element={
              <RoleRoute roles={[ROLES.ORG_ADMIN]}>
                <OrgLayout />
              </RoleRoute>
            }
          >
            <Route path="setup" element={<OrgSetup />} />
            <Route element={<RequireOrg />}>
              <Route index element={<OrgDashboard />} />
              <Route path="organization" element={<OrganizationSettings />} />
              <Route path="invites" element={<InviteLinks />} />
              <Route path="employees" element={<Employees />} />
              <Route path="employees/:id" element={<EmployeeDetail />} />
              <Route path="enrollments" element={<OrgEnrollments />} />
              <Route path="reports" element={<OrgReports />} />
              <Route path="settings" element={<AccountSettings />} />
              <Route path="*" element={<NotFound inApp />} />
            </Route>
          </Route>

          <Route
            path="learner"
            element={
              <RoleRoute roles={LEARNER_ROLES}>
                <LearnerLayout />
              </RoleRoute>
            }
          >
            <Route index element={<LearnerDashboard />} />
            <Route path="profile" element={<MyProfile />} />
            <Route path="pathway" element={<MyPathway />} />
            <Route path="learning" element={<MyLearning />} />
            <Route path="settings" element={<AccountSettings />} />
            <Route path="programmes" element={<LearnerProgrammes />} />
            <Route path="programmes/:id" element={<LearnerProgrammeDetail />} />
            <Route path="*" element={<NotFound inApp />} />
          </Route>
        </Route>

        <Route element={<PublicLayout />}>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
