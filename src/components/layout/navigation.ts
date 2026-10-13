import {
  Bell,
  BikeIcon,
  ClipboardList,
  FileBarChart,
  LayoutDashboard,
  MonitorCheck,
  ScrollText,
  ShieldCheck,
  Siren,
  Tag,
  Users,
} from 'lucide-react';
import type { Role } from '@/types';

export interface NavItem {
  to: string;
  label: string;
  icon: typeof BikeIcon;
  end?: boolean;
}

/** Navigation is derived from the signed-in role, never from a stored flag.
 * 
 * Role-based application navigation
 * 
 * Defines the navigation items available to each BikeGuard user role.
 * Navigation is determined from the authenticated user's role rather
 * than from a stored client-side flag.
 * 
 * Roles:
 *  'student' - Manage registered bikes and view notifications.
 * - 'guard' - Monitor gates, record manual crossings, and view the
 *  crossing log.
 * - 'admin' - Manage registrations, RFID tags, people, crossings,
 *     audit records, and reports.
 * 
 * 
 */
export const NAVIGATION: Record<Role, NavItem[]> = {
  student: [
    { to: '/my-bikes', label: 'My bikes', icon: BikeIcon, end: true },
    { to: '/my-bikes/register', label: 'Register a bike', icon: Tag },
    { to: '/notifications', label: 'Notifications', icon: Bell },
  ],
  guard: [
    { to: '/guard', label: 'Gate board', icon: MonitorCheck, end: true },
    { to: '/guard/manual', label: 'Manual checks', icon: ClipboardList },
    { to: '/guard/crossings', label: 'Crossing log', icon: ScrollText },
  ],
  admin: [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/registrations', label: 'Registrations', icon: ShieldCheck },
    { to: '/admin/tags', label: 'Tags', icon: Tag },
     { to: '/admin/alarms', label: 'Alarms', icon: Siren },
    { to: '/admin/crossings', label: 'Crossing log', icon: ScrollText },
    { to: '/admin/people', label: 'People', icon: Users },
    { to: '/admin/audit', label: 'Audit trail', icon: ClipboardList },
    { to: '/reports', label: 'Reports', icon: FileBarChart },
  ],
 
};
