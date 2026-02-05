import { useState } from 'react';
import { Gift, Copy, Share2, Users, Award, Check, Loader2 } from 'lucide-react';
import { useReferral } from '../../hooks/useReferral';
import { Alert, LoadingSpinner, Badge } from '../ui';

export default function ReferralCard() {
  const {
    referralCode,
    stats,
    loading,
    error,
    generateCode,
    shareReferralLink,
    copyCode,
  } = useReferral();

  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const handleGenerateCode = async () => {
    setGenerating(true);
    await generateCode();
    setGenerating(false);
  };

  const handleCopy = async () => {
    const success = await copyCode();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    setSharing(true);
    await shareReferralLink();
    setSharing(false);
  };

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Gift className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Invite & Earn
          </h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-2">
        <Gift className="h-5 w-5 text-brand-600 dark:text-brand-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Invite & Earn
        </h2>
        {stats?.subscriptionTier && stats.subscriptionTier !== 'free' && (
          <Badge variant="success" className="ml-auto capitalize">
            {stats.subscriptionTier}
          </Badge>
        )}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Share your code and both get 1 week free premium when they sign up!
      </p>

      {error && (
        <Alert variant="error" className="mb-4" dismissible onDismiss={() => {}}>
          {error}
        </Alert>
      )}

      {/* Referral Code Section */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4">
        {referralCode ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Your Referral Code</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xl font-mono font-bold text-brand-600 dark:text-brand-400 bg-white dark:bg-gray-900 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-center tracking-wider">
                {referralCode}
              </code>
              <button
                onClick={handleCopy}
                className="p-2 text-gray-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Copy code"
              >
                {copied ? (
                  <Check className="h-5 w-5 text-green-500" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </button>
            </div>
            <button
              onClick={handleShare}
              disabled={sharing}
              className="btn btn-primary w-full"
            >
              {sharing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4 mr-2" />
              )}
              {copied ? 'Link Copied!' : 'Share Invite Link'}
            </button>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Generate your unique referral code to start inviting friends
            </p>
            <button
              onClick={handleGenerateCode}
              disabled={generating}
              className="btn btn-primary"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Gift className="h-4 w-4 mr-2" />
                  Get My Referral Code
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <Users className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats?.totalReferrals || 0}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Friends Invited</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <Award className="h-5 w-5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats?.weeksEarned || 0}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Weeks Earned</p>
        </div>
      </div>

      {/* Subscription Status */}
      {stats?.subscriptionExpiresAt && (
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
          Premium expires: {new Date(stats.subscriptionExpiresAt).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}
