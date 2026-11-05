import { BookOpen, GraduationCap, LayoutDashboard, Route, Settings, UserCircle } from 'lucide-react';
import DashboardLayout from './DashboardLayout.jsx';

/** Used by both students and employees. */
const NAV = [
  { to: '/learner', labelKey: 'nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/learner/profile', labelKey: 'nav.myProfile', icon: UserCircle },
  { to: '/learner/pathway', labelKey: 'nav.myPathway', icon: Route },
  { to: '/learner/programmes', labelKey: 'nav.programmes', icon: BookOpen },
  { to: '/learner/learning', labelKey: 'nav.myLearning', icon: GraduationCap },
  { to: '/learner/settings', labelKey: 'nav.settings', icon: Settings },
];

export default function LearnerLayout() {
  return <DashboardLayout navItems={NAV} />;
}
