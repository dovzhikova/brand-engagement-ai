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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 animate-fade-in">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-carol-600 animate-slide-up">
            CAROL Engage
          </h1>
          <h2 className="mt-2 text-xl text-gray-600 dark:text-gray-400 animate-slide-up" style={{ animationDelay: '50ms' }}>
            Reddit Engagement Platform
          </h2>
        </div>

        {/* Referral Banner */}
        {referralCode && (
          <div className="card p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-700 animate-slide-up" style={{ animationDelay: '75ms' }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Gift className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {referrerName ? `${referrerName} invited you!` : 'You have a referral code!'}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Sign in to get 1 week free premium
                </p>
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="card p-6 space-y-4 animate-scale-in" style={{ animationDelay: '100ms' }}>
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
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
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
                className={`input mt-1 ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                placeholder="you@example.com"
              />
              {errors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
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
                className={`input mt-1 ${errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                placeholder="••••••••"
              />
              {errors.password && (
                <p id="password-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary w-full relative"
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
