import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../utils/prisma';
import { logger } from '../../utils/logger';

// Generate unique 8-character alphanumeric code
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar-looking characters
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate a unique referral code for a user
export async function generateReferralCode(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    // Check if user already has a code
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    if (user?.referralCode) {
      return res.json({ referralCode: user.referralCode });
    }

    // Generate unique code
    let code: string;
    let isUnique = false;
    let attempts = 0;

    do {
      code = generateCode();
      const existing = await prisma.user.findUnique({
        where: { referralCode: code },
      });
      isUnique = !existing;
      attempts++;
    } while (!isUnique && attempts < 10);

    if (!isUnique) {
      throw new Error('Failed to generate unique referral code');
    }

    // Save code to user
    await prisma.user.update({
      where: { id: userId },
      data: { referralCode: code },
    });

    logger.info(`Generated referral code ${code} for user ${userId}`);
    res.json({ referralCode: code });
  } catch (error) {
    next(error);
  }
}

// Get referral code and stats for current user
export async function getReferralStats(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        referralCode: true,
        subscriptionTier: true,
        subscriptionExpiresAt: true,
      },
    });

    // Get referral stats
    const referrals = await prisma.referral.findMany({
      where: { referrerUserId: userId },
      select: {
        status: true,
        referrerCredited: true,
        createdAt: true,
      },
    });

    const totalReferrals = referrals.length;
    const creditedReferrals = referrals.filter(r => r.status === 'credited').length;
    const pendingReferrals = referrals.filter(r => r.status === 'pending' || r.status === 'signed_up').length;
    const weeksEarned = creditedReferrals; // 1 week per credited referral

    res.json({
      referralCode: user?.referralCode || null,
      totalReferrals,
      creditedReferrals,
      pendingReferrals,
      weeksEarned,
      subscriptionTier: user?.subscriptionTier || 'free',
      subscriptionExpiresAt: user?.subscriptionExpiresAt || null,
    });
  } catch (error) {
    next(error);
  }
}

// Validate a referral code
export async function validateReferralCode(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = req.params;

    const referrer = await prisma.user.findUnique({
      where: { referralCode: code.toUpperCase() },
      select: {
        id: true,
        name: true,
      },
    });

    if (!referrer) {
      return res.status(404).json({ valid: false, error: 'Invalid referral code' });
    }

    res.json({
      valid: true,
      referrerName: referrer.name.split(' ')[0], // First name only for privacy
    });
  } catch (error) {
    next(error);
  }
}

// Apply a referral code (called after signup or from settings)
export async function applyReferralCode(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Referral code is required' });
    }

    const upperCode = code.toUpperCase();

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        referredByCode: true,
        subscriptionTier: true,
        subscriptionExpiresAt: true,
      },
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already used a referral code
    if (currentUser.referredByCode) {
      return res.status(400).json({ error: 'You have already used a referral code' });
    }

    // Find referrer by code
    const referrer = await prisma.user.findUnique({
      where: { referralCode: upperCode },
      select: {
        id: true,
        subscriptionTier: true,
        subscriptionExpiresAt: true,
      },
    });

    if (!referrer) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    // Prevent self-referral
    if (referrer.id === userId) {
      return res.status(400).json({ error: 'You cannot use your own referral code' });
    }

    // Calculate new expiration dates (7 days from now or extend existing)
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const refereeNewExpiry = currentUser.subscriptionExpiresAt && currentUser.subscriptionExpiresAt > now
      ? new Date(currentUser.subscriptionExpiresAt.getTime() + 7 * 24 * 60 * 60 * 1000)
      : sevenDaysFromNow;

    const referrerNewExpiry = referrer.subscriptionExpiresAt && referrer.subscriptionExpiresAt > now
      ? new Date(referrer.subscriptionExpiresAt.getTime() + 7 * 24 * 60 * 60 * 1000)
      : sevenDaysFromNow;

    // Use a transaction to update everything atomically
    await prisma.$transaction(async (tx) => {
      // Update referee (current user)
      await tx.user.update({
        where: { id: userId },
        data: {
          referredByCode: upperCode,
          referredByUserId: referrer.id,
          subscriptionTier: currentUser.subscriptionTier === 'free' ? 'premium' : currentUser.subscriptionTier,
          subscriptionExpiresAt: refereeNewExpiry,
        },
      });

      // Update referrer (only if not lifetime)
      if (referrer.subscriptionTier !== 'lifetime') {
        await tx.user.update({
          where: { id: referrer.id },
          data: {
            subscriptionTier: referrer.subscriptionTier === 'free' ? 'premium' : referrer.subscriptionTier,
            subscriptionExpiresAt: referrerNewExpiry,
          },
        });
      }

      // Create or update referral record
      await tx.referral.upsert({
        where: {
          referrerUserId_refereeEmail: {
            referrerUserId: referrer.id,
            refereeEmail: currentUser.email,
          },
        },
        create: {
          referrerUserId: referrer.id,
          refereeUserId: userId,
          refereeEmail: currentUser.email,
          status: 'credited',
          referrerCredited: true,
          referrerCreditedAt: now,
          refereeCredited: true,
          refereeCreditedAt: now,
          completedAt: now,
          expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
        update: {
          refereeUserId: userId,
          status: 'credited',
          referrerCredited: true,
          referrerCreditedAt: now,
          refereeCredited: true,
          refereeCreditedAt: now,
          completedAt: now,
        },
      });
    });

    logger.info(`Referral code ${upperCode} applied: user ${userId} referred by ${referrer.id}`);

    res.json({
      success: true,
      message: 'Referral applied! You both received 1 week free premium.',
      subscriptionTier: currentUser.subscriptionTier === 'free' ? 'premium' : currentUser.subscriptionTier,
      subscriptionExpiresAt: refereeNewExpiry,
    });
  } catch (error) {
    next(error);
  }
}

// Get list of user's referrals
export async function getReferralHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    const referrals = await prisma.referral.findMany({
      where: { referrerUserId: userId },
      select: {
        id: true,
        status: true,
        referrerCredited: true,
        createdAt: true,
        completedAt: true,
        referee: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedReferrals = referrals.map(r => ({
      id: r.id,
      refereeName: r.referee?.name?.split(' ')[0] || 'Anonymous', // First name only
      status: r.status,
      credited: r.referrerCredited,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
    }));

    res.json({ referrals: formattedReferrals });
  } catch (error) {
    next(error);
  }
}
