import { BarChart3, Building2, ClipboardList, LayoutDashboard, Link2, Settings, Users } from 'lucide-react';
import DashboardLayout from './DashboardLayout.jsx';

const NAV = [
  { to: '/org', labelKey: 'nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/org/organization', labelKey: 'nav.organization', icon: Building2 },
  { to: '/org/invites', labelKey: 'nav.invites', icon: Link2 },
  { to: '/org/employees', labelKey: 'nav.employees', icon: Users },
  { to: '/org/enrollments', labelKey: 'nav.enrollments', icon: ClipboardList },
  { to: '/org/reports', labelKey: 'nav.reports', icon: BarChart3 },
  { to: '/org/settings', labelKey: 'nav.settings', icon: Settings },
];

export default function OrgLayout() {
  return <DashboardLayout navItems={NAV} />;
}
