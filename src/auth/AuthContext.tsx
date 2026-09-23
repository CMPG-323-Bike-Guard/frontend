import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Role, User } from '@/types';
import { api, getStoredToken, setStoredToken } from '@/api/client';

interface AuthState {
  user: User | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  signIn(
    studentStaffNumber: string,
    password: string,
    selectedRole: Role,
  ): Promise<User>;
  signOut(): void;
  can(...roles: Role[]): boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] =
    useState<AuthState['status']>('loading');

  useEffect(() => {
    const token = getStoredToken();

    if (!token) {
      setStatus('anonymous');
      return;
    }

    let cancelled = false;

    api
      .session(token)
      .then((session) => {
        if (cancelled) return;

        setUser(session.user);
        setStatus('authenticated');
      })
      .catch(() => {
        if (cancelled) return;

        setStoredToken(null);
        setStatus('anonymous');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(
    async (
      studentStaffNumber: string,
      password: string,
      selectedRole: Role,
    ) => {
      const session = await api.login(
        studentStaffNumber,
        password,
      );

      /*
       * The authenticated account's role comes from the API.
       * Make sure it matches the role selected on the sign-in page.
       */
      if (session.user.role !== selectedRole) {
        throw new Error(
          'This account does not belong to the selected role.',
        );
      }

      setStoredToken(session.token);
      setUser(session.user);
      setStatus('authenticated');

      return session.user;
    },
    [],
  );

  const signOut = useCallback(() => {
    setStoredToken(null);
    setUser(null);
    setStatus('anonymous');
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      status,
      signIn,
      signOut,
      can: (...roles: Role[]) =>
        Boolean(user && roles.includes(user.role)),
    }),
    [user, status, signIn, signOut],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used inside <AuthProvider>.',
    );
  }

  return context;
}

export function useCurrentUser(): User {
  const { user } = useAuth();

  if (!user) {
    throw new Error(
      'This screen requires an authenticated user.',
    );
  }

  return user;
}