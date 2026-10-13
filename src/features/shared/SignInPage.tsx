import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { Role } from '@/types';
import { useAuth } from '@/auth/AuthContext';
import { ApiError } from '@/api/client';
import { ROLE_HOME } from '@/lib/constants';
import {
  hasErrors,
  validatePassword,
  validateStudentNumber,
  type FieldErrors,
} from '@/lib/validation';
import { Brand } from '@/components/layout/Brand';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { INSTITUTION } from '@/lib/constants';

/** The four sign-in roles shown as tabs above the credentials form. */
const ROLE_TABS = [
  { key: 'student', label: 'Student or Staff' },
  { key: 'guard', label: 'Security' },
  { key: 'admin', label: 'Administrator' },
] as const;

export function SignInPage() {
  const { user, status, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedRole, setSelectedRole] =
    useState<Role>('student');

  const [studentNumber, setStudentNumber] = useState('');
  const [password, setPassword] = useState('');

  const [errors, setErrors] =
    useState<FieldErrors<'studentNumber' | 'password'>>({});

  const [formError, setFormError] =
    useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated' && user) {
    const from = (location.state as { from?: string } | null)?.from;

    return (
      <Navigate
        to={
          from && from !== '/sign-in'
            ? from
            : ROLE_HOME[user.role]
        }
        replace
      />
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();

    const nextErrors = {
      studentNumber: validateStudentNumber(studentNumber),
      password: validatePassword(password),
    };

    setErrors(nextErrors);
    setFormError(null);

    if (hasErrors(nextErrors)) return;

    setSubmitting(true);

    try {
      const signedIn = await signIn(
        studentNumber,
        password,
        selectedRole,
      );

      navigate(ROLE_HOME[signedIn.role], {
        replace: true,
      });
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Sign-in failed. Try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,0.62fr)_minmax(0,1fr)]">

      {/* =========================================================
          BIKEGUARD INFORMATION SECTION
          ========================================================= */}
      <section
        className="relative hidden flex-col overflow-hidden bg-brand-purple px-10 py-12 text-white lg:flex"
      >

        {/* BikeGuard logo */}
        <div className="flex items-center gap-4">
          <Brand className="text-3xl" invert />
        </div>

        {/* Main content */}
        <div className="mt-auto mb-auto max-w-2xl">

          {/* Main heading */}
          <h1 className="max-w-xl text-4xl font-semibold leading-tight text-white">
            The gate checks that the bike and the rider belong together.
          </h1>

          {/* Explanation */}
          <p className="prose-measure mt-5 text-lg leading-relaxed text-ink-200">
            A card on its own proves who you are. A tag on its own proves
            which bike it is. BikeGuard checks the pair, at the moment the
            bike is leaving campus.
          </p>

          {/* =====================================================
              GATE ARM
              A straight barrier-arm bar with a diagonal hazard-
              stripe fill, matching the boom gate graphic. The
              message sits below it as plain text.
              ===================================================== */}
          <div className="mt-16 max-w-md">

            <div
              className="h-4 w-full rounded-sm shadow-sm"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, #ef4444 0px, #ef4444 14px, #f8fafc 14px, #f8fafc 28px)',
              }}
              aria-hidden="true"
            />

            <p className="mt-5 text-2xl font-semibold leading-tight text-white">
              Held until the card and the tag agree.
            </p>

          </div>

        </div>

        {/* Footer */}
        <p className="text-sm uppercase tracking-wide text-ink-400">
          NORTH-WEST UNIVERSITY PROTECTION SERVICES
        </p>

      </section>

      {/* =========================================================
          SIGN-IN SECTION
          ========================================================= */}
      <section className="flex items-center justify-center px-5 py-10 sm:px-10">

        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden">
            <Brand className="text-2xl" />

            <p className="mt-1 text-sm text-ink-500">
              {INSTITUTION} bicycle access control
            </p>
          </div>

          <h2 className="mt-8 text-2xl font-semibold lg:mt-0">
            Sign in
          </h2>

          <p className="mt-1 text-sm text-ink-500">
            Use your NWU student or staff number.
          </p>

          {/* Role selector */}
          <div className="mt-6 grid w-full grid-cols-3 gap-2 rounded-lg bg-ink-50 px-0 py-1">

            {ROLE_TABS.map((role) => {
              const selected = selectedRole === role.key;

              return (
                <button
                  key={role.key}
                  type="button"
                  onClick={() => {
                    setSelectedRole(role.key);
                    setFormError(null);
                  }}
                  className={[
                    'w-full min-w-0 rounded-md px-1 py-2 text-[13px] font-medium leading-5 transition cursor-pointer min-[400px]:whitespace-nowrap sm:px-2 sm:text-sm',
                    selected
                      ? 'bg-white text-signal-600 shadow-sm'
                      : 'text-ink-500 hover:text-ink-900',
                  ].join(' ')}
                  aria-pressed={selected}
                >
                  {role.label}
                </button>
              );
            })}

          </div>

          {/* Login form */}
          <form
            onSubmit={onSubmit}
            noValidate
            className="mt-6 flex flex-col gap-4"
          >

            {formError && (
              <Alert tone="alert">
                {formError}
              </Alert>
            )}

            <Field
              label="Username"
              error={errors.studentNumber}
              required
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  inputMode="numeric"
                  autoComplete="username"
                  maxLength={8}
                  placeholder="41002381"
                  value={studentNumber}
                  onChange={(event) =>
                    setStudentNumber(
                      event.target.value.replace(/\D/g, ''),
                    )
                  }
                />
              )}
            </Field>

            <Field
              label="Password"
              error={errors.password}
              required
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                />
              )}
            </Field>

            <Button
              type="submit"
              size="lg"
              loading={submitting}
              icon={
                <ArrowRight className="h-4 w-4" />
              }
            >
              Sign in
            </Button>

          </form>

        </div>
      </section>

    </div>
  );
}

