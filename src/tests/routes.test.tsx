import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NAVIGATION } from '@/components/layout/navigation';
import type { Role } from '@/types';
import { renderAppAs } from './renderApp';

const USERS: Record<Role, string> = { student: 'u-102', guard: 'u-201', admin: 'u-301' };

describe('every sidebar link opens a real page', () => {
  (Object.keys(NAVIGATION) as Role[]).forEach((role) => {
    const paths = Array.from(new Set(NAVIGATION[role].flatMap((group) => group.items.map((item) => item.to))));
    it.each(paths)(`${role}: %s`, async (path) => {
      renderAppAs(USERS[role], path);
      await new Promise((resolve) => setTimeout(resolve, 400));
      expect(screen.queryByText('That page does not exist')).not.toBeInTheDocument();
      expect(screen.queryByText(/not allowed|no access/i)).not.toBeInTheDocument();
    });
  });
});