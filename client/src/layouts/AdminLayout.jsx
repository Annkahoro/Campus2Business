import {
  BarChart3,
  BookOpen,
  Building2,
  ClipboardList,
  LayoutDashboard,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Tags,
  Users,
} from 'lucide-react';
import DashboardLayout from './DashboardLayout.jsx';

const NAV = [
  { to: '/admin', labelKey: 'nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/organizations', labelKey: 'nav.organizations', icon: Building2 },
  { to: '/admin/learners', labelKey: 'nav.learners', icon: Users },
  { to: '/admin/recommendations', labelKey: 'nav.recommendations', icon: Sparkles },
  { to: '/admin/programmes', labelKey: 'nav.programmes', icon: BookOpen },
  { to: '/admin/categories', labelKey: 'nav.categories', icon: Tags },
  { to: '/admin/programme-fields', labelKey: 'nav.programmeFields', icon: SlidersHorizontal },
  { to: '/admin/enrollments', labelKey: 'nav.enrollments', icon: ClipboardList },
  { to: '/admin/reports', labelKey: 'nav.reports', icon: BarChart3 },
  { to: '/admin/settings', labelKey: 'nav.settings', icon: Settings },
];

export default function AdminLayout() {
  return <DashboardLayout navItems={NAV} />;
}
