import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock3,
  FileText,
  Fingerprint,
  Mail,
  Moon,
  RefreshCw,
  Send,
  ShieldCheck,
  SunMedium,
  UserRound,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppContext } from '@/context/AppContext';
import { getSession } from '@/lib/supabase-client';
import { Button } from './ui/button';

const REVIEW_DRAFT_KEY = 'reelsy_ban_review_draft';
const RESTRICTION_STORAGE_KEY = 'reelsy_account_restriction';

const appealOptions = [
  { id: 'mistake', label: 'Mistake', text: 'This ban was applied to the wrong account or content.' },
  { id: 'context', label: 'Context', text: 'Important context was missed during the first review.' },
  { id: 'compromised', label: 'Compromised', text: 'Someone else may have accessed this account.' },
  { id: 'other', label: 'Other', text: 'A different issue needs a human review.' },
] as const;

type AppealType = (typeof appealOptions)[number]['id'];

const getTelemetry = () => ({
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  locale: navigator.language,
  platform: navigator.platform,
  screenResolution: `${window.screen.width}x${window.screen.height}`,
  viewport: `${window.innerWidth}x${window.innerHeight}`,
  deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
  deviceCores: navigator.hardwareConcurrency,
  connectionType: (navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType,
});

export const BannedUser = () => {
  const { user, setUser, setAppPhase, theme, setTheme } = useAppContext();
  const [accountId, setAccountId] = useState(user?.username || '');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [appealType, setAppealType] = useState<AppealType>('mistake');
  const [reviewText, setReviewText] = useState('');
  const [evidenceText, setEvidenceText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [confirmTruth, setConfirmTruth] = useState(false);
  const [confirmContact, setConfirmContact] = useState(false);

  const selectedAppeal = appealOptions.find((option) => option.id === appealType) || appealOptions[0];
  const totalCharacters = reviewText.trim().length + evidenceText.trim().length;
  const canSubmit =
    accountId.trim().length >= 3 &&
    contactEmail.trim().includes('@') &&
    reviewText.trim().length >= 20 &&
    confirmTruth &&
    confirmContact &&
    !isSubmitting;

  const statusItems = useMemo(
    () => [
      {
        label: 'Restriction',
        value: user?.isBanned ? 'Active ban' : user?.isSuspended ? 'Suspended' : 'Under review',
      },
      {
        label: 'Review window',
        value: 'Up to 24 hours',
      },
      {
        label: 'Sync',
        value: lastSyncedAt ? `Checked ${lastSyncedAt}` : 'Auto checks on refresh',
      },
    ],
    [lastSyncedAt, user?.isBanned, user?.isSuspended]
  );

  useEffect(() => {
    if (user && !user.isBanned && !user.isSuspended) {
      sessionStorage.removeItem(RESTRICTION_STORAGE_KEY);
      setAppPhase('main');
    }
  }, [user, setAppPhase]);

  useEffect(() => {
    setAccountId((current) => current || user?.username || '');
    setContactEmail((current) => current || user?.email || '');
  }, [user?.email, user?.username]);

  useEffect(() => {
    try {
      const rawDraft = localStorage.getItem(REVIEW_DRAFT_KEY);
      if (!rawDraft) return;
      const draft = JSON.parse(rawDraft);
      setAccountId(draft.accountId || user?.username || '');
      setContactEmail(draft.contactEmail || user?.email || '');
      setAppealType(draft.appealType || 'mistake');
      setReviewText(draft.reviewText || '');
      setEvidenceText(draft.evidenceText || '');
      setConfirmTruth(Boolean(draft.confirmTruth));
      setConfirmContact(Boolean(draft.confirmContact));
    } catch {
      localStorage.removeItem(REVIEW_DRAFT_KEY);
    }
  }, [user?.email, user?.username]);

  useEffect(() => {
    localStorage.setItem(
      REVIEW_DRAFT_KEY,
      JSON.stringify({
        accountId,
        contactEmail,
        appealType,
        reviewText,
        evidenceText,
        confirmTruth,
        confirmContact,
      })
    );
  }, [accountId, contactEmail, appealType, reviewText, evidenceText, confirmTruth, confirmContact]);

  const handleToggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = () => {
    localStorage.removeItem('reelsy_user');
    localStorage.removeItem('authToken');
    localStorage.removeItem('supabaseId');
    sessionStorage.removeItem(RESTRICTION_STORAGE_KEY);
    setUser(null);
    setAppPhase('auth-email');
  };

  const syncAccountStatus = async (silent = false) => {
    if (!silent) setReviewError(null);
    setIsSyncing(true);

    try {
      const username = accountId.trim() || user?.username;
      if (username) {
        const profileResponse = await fetch(`/api/auth/profile/${encodeURIComponent(username)}`);
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          const syncedUser = {
            ...(user || {
              username: profileData.username,
              nickname: profileData.displayName || profileData.username,
              age: profileData.age || 18,
            }),
            username: profileData.username,
            nickname: profileData.displayName || user?.nickname || profileData.username,
            email: profileData.email || user?.email,
            avatar: profileData.profileImage || user?.avatar,
            age: profileData.age || user?.age || 18,
            isBanned: profileData.isBanned || false,
            banReason: profileData.banReason || undefined,
            bannedAt: profileData.bannedAt || undefined,
            bannedUntil: profileData.bannedUntil || undefined,
            isSuspended: profileData.isSuspended || false,
            suspensionReason: profileData.suspensionReason || undefined,
            suspensionDetails: profileData.suspensionDetails || undefined,
            supabaseId: user?.supabaseId,
          };

          setUser(syncedUser);
          setLastSyncedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

          if (!syncedUser.isBanned && !syncedUser.isSuspended) {
            sessionStorage.removeItem(RESTRICTION_STORAGE_KEY);
            setAppPhase('main');
            return;
          }

          sessionStorage.setItem(
            RESTRICTION_STORAGE_KEY,
            JSON.stringify({
              phase: syncedUser.isBanned ? 'banned' : 'account-suspended',
              user: syncedUser,
              reason: syncedUser.banReason || syncedUser.suspensionReason,
              updatedAt: new Date().toISOString(),
            })
          );
          return;
        }
      }

      const session = await getSession();
      if (session?.access_token) {
        setLastSyncedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (error) {
      if (!silent) {
        setReviewError(error instanceof Error ? error.message : 'Status sync failed. Try again.');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const handleWake = () => {
      syncAccountStatus(true);
    };

    window.addEventListener('focus', handleWake);
    document.addEventListener('visibilitychange', handleWake);
    syncAccountStatus(true);

    return () => {
      window.removeEventListener('focus', handleWake);
      document.removeEventListener('visibilitychange', handleWake);
    };
    // Run on mount and when the remembered account changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const handleSubmitReview = async () => {
    if (!canSubmit) {
      setReviewError('Complete the account, email, reason, and confirmations before sending.');
      return;
    }

    setIsSubmitting(true);
    setReviewStatus('idle');
    setReviewError(null);

    try {
      const submittedAt = new Date().toISOString();
      const response = await fetch('/api/auth/suspension-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: contactEmail.trim(),
          username: accountId.trim(),
          reviewData: {
            type: 'ban_appeal',
            appealType,
            message: reviewText.trim(),
            evidence: evidenceText.trim(),
            banReason: user?.banReason,
            submittedAt,
          },
          telemetry: {
            ...getTelemetry(),
            reviewType: 'ban_appeal',
            appealType,
            appealLabel: selectedAppeal.label,
            appealMessage: reviewText.trim(),
            evidence: evidenceText.trim(),
            banReason: user?.banReason,
            bannedAt: user?.bannedAt,
            bannedUntil: user?.bannedUntil,
            submittedAt,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to submit appeal');
      }

      setReviewId(`R-${Date.now().toString(36).toUpperCase()}`);
      setReviewStatus('success');
      setReviewText('');
      setEvidenceText('');
      setConfirmTruth(false);
      setConfirmContact(false);
      localStorage.removeItem(REVIEW_DRAFT_KEY);
    } catch (error) {
      setReviewStatus('error');
      setReviewError(error instanceof Error ? error.message : 'Could not submit appeal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-5">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-[460px]"
      >
        <div className="overflow-hidden rounded-[34px] border border-border bg-background shadow-2xl">
          <div className="px-5 pb-4 pt-5">
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-2 text-[11px] font-bold text-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Account safety
              </div>

              <div className="flex items-center gap-2 rounded-full bg-secondary p-1">
                <button
                  type="button"
                  onClick={handleToggleTheme}
                  aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-background text-foreground shadow-sm"
                >
                  {theme === 'dark' ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => syncAccountStatus()}
                  disabled={isSyncing}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground disabled:opacity-50"
                  aria-label="Sync ban status"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Access restricted</p>
              <h1 className="mt-2 text-[32px] font-extrabold leading-[1.05] tracking-normal text-foreground">
                Your Reelsy account is banned.
              </h1>
              <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
                This page now keeps itself synced on refresh, tab focus, and visibility changes. Submit a detailed review request below if this looks wrong.
              </p>
            </div>
          </div>

          <div className="border-y border-secondary/70 bg-secondary/55 px-5 py-4">
            <div className="grid grid-cols-3 gap-2">
              {statusItems.map((item) => (
                <div key={item.label} className="rounded-[20px] bg-background px-3 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
                  <p className="mt-1 text-[12px] font-bold leading-4 text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 px-5 py-5">
            <div className="rounded-[26px] border border-border bg-background p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-foreground">Ban details</p>
                  <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                    {user?.banReason || 'No public reason was attached. Support can still review the account history.'}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                {user?.bannedAt && (
                  <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-2 text-[12px] font-semibold text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    Banned {new Date(user.bannedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                )}
                {user?.bannedUntil && (
                  <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-2 text-[12px] font-semibold text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    Ends {new Date(user.bannedUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Review request</p>
                  <h2 className="mt-1 text-[21px] font-extrabold text-foreground">Ask for a human review</h2>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                  <FileText className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <label className="flex items-center gap-3 rounded-full bg-secondary px-4 py-3">
                  <UserRound className="h-4 w-4 text-muted-foreground" />
                  <input
                    value={accountId}
                    onChange={(event) => setAccountId(event.target.value)}
                    placeholder="username"
                    className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-foreground outline-none placeholder:text-muted-foreground/60"
                  />
                </label>

                <label className="flex items-center gap-3 rounded-full bg-secondary px-4 py-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <input
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    placeholder="email for review updates"
                    className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-foreground outline-none placeholder:text-muted-foreground/60"
                  />
                </label>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {appealOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setAppealType(option.id)}
                    className={`rounded-[20px] border px-3 py-3 text-left transition ${
                      appealType === option.id
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border bg-secondary text-foreground'
                    }`}
                  >
                    <p className="text-[12px] font-extrabold">{option.label}</p>
                    <p className={`mt-1 text-[10px] leading-4 ${appealType === option.id ? 'text-background/70' : 'text-muted-foreground'}`}>
                      {option.text}
                    </p>
                  </button>
                ))}
              </div>

              <div className="mt-4 rounded-[22px] bg-secondary p-4">
                <p className="text-[12px] font-bold text-foreground">Your explanation</p>
                <textarea
                  value={reviewText}
                  onChange={(event) => setReviewText(event.target.value)}
                  rows={5}
                  placeholder="Tell the review team what happened, what should be checked, and why the ban should be reversed."
                  className="mt-3 w-full resize-none bg-transparent text-[13px] leading-6 text-foreground outline-none placeholder:text-muted-foreground/60"
                />
              </div>

              <div className="mt-3 rounded-[22px] bg-secondary p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12px] font-bold text-foreground">Evidence or extra context</p>
                  <span className="rounded-full bg-background px-2 py-1 text-[10px] font-bold text-muted-foreground">
                    {totalCharacters} chars
                  </span>
                </div>
                <textarea
                  value={evidenceText}
                  onChange={(event) => setEvidenceText(event.target.value)}
                  rows={3}
                  placeholder="Add dates, links, usernames, or anything that helps support review faster."
                  className="mt-3 w-full resize-none bg-transparent text-[13px] leading-6 text-foreground outline-none placeholder:text-muted-foreground/60"
                />
              </div>

              <div className="mt-4 space-y-2">
                <label className="flex items-start gap-3 rounded-[18px] bg-secondary px-4 py-3">
                  <input
                    type="checkbox"
                    checked={confirmTruth}
                    onChange={(event) => setConfirmTruth(event.target.checked)}
                    className="mt-1 h-4 w-4 accent-foreground"
                  />
                  <span className="text-[12px] font-semibold leading-5 text-muted-foreground">
                    I confirm this review request is accurate and written by the account owner.
                  </span>
                </label>
                <label className="flex items-start gap-3 rounded-[18px] bg-secondary px-4 py-3">
                  <input
                    type="checkbox"
                    checked={confirmContact}
                    onChange={(event) => setConfirmContact(event.target.checked)}
                    className="mt-1 h-4 w-4 accent-foreground"
                  />
                  <span className="text-[12px] font-semibold leading-5 text-muted-foreground">
                    Reelsy can contact me at this email about the review decision.
                  </span>
                </label>
              </div>

              {reviewStatus === 'success' && (
                <div className="mt-4 rounded-[22px] border border-border bg-secondary p-4 text-[13px] leading-5 text-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <p className="font-semibold">Review sent{reviewId ? `: ${reviewId}` : ''}. We will review it shortly.</p>
                  </div>
                </div>
              )}

              {reviewStatus === 'error' && reviewError && (
                <div className="mt-4 rounded-[22px] border border-border bg-secondary p-4 text-[13px] leading-5 text-foreground">
                  {reviewError}
                </div>
              )}

              <div className="mt-4 grid gap-3">
                <Button
                  onClick={handleSubmitReview}
                  disabled={!canSubmit}
                  className="w-full rounded-full bg-foreground py-3 font-extrabold text-background"
                >
                  {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isSubmitting ? 'Sending review...' : 'Send review'}
                </Button>

                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="w-full rounded-full border-border py-3 font-extrabold text-foreground"
                >
                  Return to login
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[auto_1fr] gap-3 rounded-[24px] bg-secondary p-4 text-[12px] leading-6 text-muted-foreground">
          <Fingerprint className="mt-1 h-4 w-4 text-foreground" />
          <p>
            Reelsy saves your appeal draft locally and quietly rechecks account status when the browser refreshes, focuses, or becomes visible again.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default BannedUser;
