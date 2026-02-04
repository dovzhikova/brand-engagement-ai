import { useState, useEffect, useCallback } from 'react';
import { referralsApi } from '../services/api';

export interface ReferralStats {
  referralCode: string | null;
  totalReferrals: number;
  creditedReferrals: number;
  pendingReferrals: number;
  weeksEarned: number;
  subscriptionTier: string;
  subscriptionExpiresAt: string | null;
}

export interface ReferralHistoryItem {
  id: string;
  refereeName: string;
  status: string;
  credited: boolean;
  createdAt: string;
  completedAt: string | null;
}

export interface UseReferralResult {
  // State
  referralCode: string | null;
  stats: ReferralStats | null;
  history: ReferralHistoryItem[];
  loading: boolean;
  error: string | null;

  // Actions
  generateCode: () => Promise<string | null>;
  applyCode: (code: string) => Promise<{ success: boolean; message: string }>;
  validateCode: (code: string) => Promise<{ valid: boolean; referrerName?: string }>;
  shareReferralLink: () => Promise<boolean>;
  copyCode: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useReferral(): UseReferralResult {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [history, setHistory] = useState<ReferralHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch stats and history
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, historyRes] = await Promise.all([
        referralsApi.getStats(),
        referralsApi.getHistory(),
      ]);

      const statsData = statsRes.data as ReferralStats;
      setStats(statsData);
      setReferralCode(statsData.referralCode);
      setHistory((historyRes.data as { referrals: ReferralHistoryItem[] }).referrals || []);
    } catch (err) {
      console.error('Failed to fetch referral data:', err);
      setError('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Generate referral code
  const generateCode = useCallback(async (): Promise<string | null> => {
    try {
      setError(null);
      const response = await referralsApi.generateCode();
      const code = (response.data as { referralCode: string }).referralCode;
      setReferralCode(code);
      await refresh(); // Refresh stats
      return code;
    } catch (err) {
      console.error('Failed to generate code:', err);
      setError('Failed to generate referral code');
      return null;
    }
  }, [refresh]);

  // Apply a referral code
  const applyCode = useCallback(async (code: string): Promise<{ success: boolean; message: string }> => {
    try {
      setError(null);
      const response = await referralsApi.applyCode(code);
      const data = response.data as { success: boolean; message: string };
      await refresh(); // Refresh stats after applying
      return { success: true, message: data.message };
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to apply referral code';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  }, [refresh]);

  // Validate a referral code
  const validateCode = useCallback(async (code: string): Promise<{ valid: boolean; referrerName?: string }> => {
    try {
      const response = await referralsApi.validateCode(code);
      const data = response.data as { valid: boolean; referrerName?: string };
      return data;
    } catch {
      return { valid: false };
    }
  }, []);

  // Share referral link using Web Share API
  const shareReferralLink = useCallback(async (): Promise<boolean> => {
    if (!referralCode) {
      setError('No referral code available');
      return false;
    }

    const shareUrl = `${window.location.origin}/signup?ref=${referralCode}`;
    const shareData = {
      title: 'Join me on Brand Engage',
      text: `Use my code ${referralCode} to get 1 week premium free!`,
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        return true;
      } catch (err) {
        // User cancelled or error
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
        return false;
      }
    } else {
      // Fallback to clipboard
      return copyCode();
    }
  }, [referralCode]);

  // Copy code to clipboard
  const copyCode = useCallback(async (): Promise<boolean> => {
    if (!referralCode) {
      setError('No referral code available');
      return false;
    }

    const shareUrl = `${window.location.origin}/signup?ref=${referralCode}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      return true;
    } catch (err) {
      console.error('Failed to copy:', err);
      setError('Failed to copy to clipboard');
      return false;
    }
  }, [referralCode]);

  return {
    referralCode,
    stats,
    history,
    loading,
    error,
    generateCode,
    applyCode,
    validateCode,
    shareReferralLink,
    copyCode,
    refresh,
  };
}

export default useReferral;
