import {
  Bell,
  BikeIcon,
  ClipboardList,
  FileBarChart,
  Images,
  LayoutDashboard,
  MonitorCheck,
  ScrollText,
  ShieldCheck,
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

export interface NavGroup {
  label?: string;
  items: NavItem[];
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
export const NAVIGATION: Record<Role, NavGroup[]> = {
  student: [
    { items: [
      { to: '/my-bikes', label: 'My bikes', icon: BikeIcon, end: true },
      { to: '/my-bikes/register', label: 'Register a bike', icon: Tag },
      { to: '/notifications', label: 'Notifications', icon: Bell },
    ] },
  ],
  guard: [
    { items: [
      { to: '/guard', label: 'Gate board', icon: MonitorCheck, end: true },
      { to: '/guard/manual', label: 'Manual checks', icon: ClipboardList },
      { to: '/guard/crossings', label: 'Crossing log', icon: ScrollText },
      { to: '/notifications', label: 'Notifications', icon: Bell },
    ] },
  ],
  admin: [
    {
      label: 'Operations',
      items: [
        { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
        { to: '/admin/registrations', label: 'Registrations', icon: ShieldCheck },
        { to: '/admin/tags', label: 'Tags', icon: Tag },
        { to: '/admin/crossings', label: 'Crossing log', icon: ScrollText },
        { to: '/notifications', label: 'Notifications', icon: Bell },
      ],
    },
    {
      label: 'People and records',
      items: [
        { to: '/admin/people', label: 'People', icon: Users },
        { to: '/admin/photo-reviews', label: 'Photo reviews', icon: Images },
        { to: '/admin/audit', label: 'Audit trail', icon: ClipboardList },
      ],
    },
    {
      label: 'Insights',
      items: [{ to: '/reports', label: 'Reports', icon: FileBarChart }],
    },
  ],
};
