import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { authApi, referralsApi } from '../services/api';
import { useAuthStore } from '../hooks/useAuthStore';
import { Alert } from '../components/ui';
import { ButtonSpinner } from '../components/ui';
import { Gift } from 'lucide-react';

interface LoginForm {
  email: string;
  password: string;
}

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuthStore();
  const [error, setError] = useState('');
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<LoginForm>();

  // Check for referral code in URL
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setReferralCode(ref.toUpperCase());
      // Store in sessionStorage for later use
      sessionStorage.setItem('pendingReferralCode', ref.toUpperCase());
      // Validate and get referrer name
      referralsApi.validateCode(ref).then((response) => {
        const data = response.data as { valid: boolean; referrerName?: string };
        if (data.valid && data.referrerName) {
          setReferrerName(data.referrerName);
        }
      }).catch(() => {
        // Invalid code, clear it
        setReferralCode(null);
        sessionStorage.removeItem('pendingReferralCode');
      });
    }
  }, [searchParams]);

  const onSubmit = async (data: LoginForm) => {
    try {
      setError('');
      const response = await authApi.login(data.email, data.password);
      login(response.data);

      // Try to apply pending referral code after login
      const pendingRef = sessionStorage.getItem('pendingReferralCode');
      if (pendingRef) {
        try {
          await referralsApi.applyCode(pendingRef);
          sessionStorage.removeItem('pendingReferralCode');
        } catch {
          // Silently fail - user can apply manually later
        }
      }

      navigate('/');
    } catch {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-surface-900 dark:via-surface-900 dark:to-primary-950 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="max-w-md w-full space-y-8 animate-fade-in relative">
        {/* Logo + Heading */}
        <div className="text-center">
          <div className="mx-auto w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-glow-primary mb-6 animate-slide-up">
            <span className="text-white font-bold text-2xl">E</span>
          </div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white tracking-heading animate-slide-up" style={{ animationDelay: '50ms' }}>
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-surface-500 dark:text-surface-400 animate-slide-up" style={{ animationDelay: '75ms' }}>
            Sign in to your Engage platform
          </p>
        </div>

        {/* Referral Banner */}
        {referralCode && (
          <div className="bg-white/80 dark:bg-surface-800/80 backdrop-blur-xl p-4 rounded-2xl shadow-card border border-purple-200/50 dark:border-purple-700/50 animate-slide-up" style={{ animationDelay: '75ms' }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30">
                <Gift className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                  {referrerName ? `${referrerName} invited you!` : 'You have a referral code!'}
                </p>
                <p className="text-xs text-surface-500 dark:text-surface-400">
                  Sign in to get 1 week free premium
                </p>
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-white/80 dark:bg-surface-800/80 backdrop-blur-xl p-8 rounded-2xl shadow-float border border-surface-200/50 dark:border-surface-700/50 space-y-5 animate-scale-in" style={{ animationDelay: '100ms' }}>
            {error && (
              <Alert
                variant="error"
                dismissible
                onDismiss={() => setError('')}
              >
                {error}
              </Alert>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5"
              >
                Email address
              </label>
              <input
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : undefined}
                className={`input ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                placeholder="you@example.com"
              />
              {errors.email && (
                <p id="email-error" className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5"
              >
                Password
              </label>
              <input
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters',
                  },
                })}
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={errors.password ? 'password-error' : undefined}
                className={`input ${errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                placeholder="••••••••"
              />
              {errors.password && (
                <p id="password-error" className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-medium rounded-lg hover:shadow-glow-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-surface-800 relative"
            >
              {isSubmitting ? (
                <>
                  <ButtonSpinner className="mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
