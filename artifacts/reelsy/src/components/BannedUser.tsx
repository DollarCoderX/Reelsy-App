import { useEffect, useState } from 'react';
import { AlertCircle, Calendar, FileText, Moon, SunMedium, Star, CheckCircle2 } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { Button } from './ui/button';
import { motion } from 'framer-motion';

/**
 * BannedUser component - Displayed when user is banned
 * Shows ban reason, ban date, and contact/appeal option
 */
export const BannedUser = () => {
  const { user, setAppPhase, theme, setTheme } = useAppContext();
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.isBanned && !user?.isSuspended) {
      setAppPhase('main');
    }
  }, [user, setAppPhase]);

  const handleToggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = () => {
    localStorage.removeItem('reelsy_user');
    localStorage.removeItem('authToken');
    localStorage.removeItem('supabaseId');
    setAppPhase('auth-email');
  };

  const handleSubmitReview = async () => {
    if (!user?.username || !user?.email) {
      setReviewError('Unable to submit review. Please log in again.');
      return;
    }

    if (reviewText.trim().length < 20) {
      setReviewError('Please write at least 20 characters.');
      return;
    }

    setIsSubmitting(true);
    setReviewStatus('idle');
    setReviewError(null);

    try {
      const response = await fetch('/api/auth/suspension-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          username: user.username,
          reviewData: {
            type: 'ban_appeal',
            rating,
            message: reviewText.trim(),
            banReason: user.banReason,
            submittedAt: new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to submit appeal');
      }

      setReviewStatus('success');
      setReviewText('');
    } catch (error) {
      setReviewStatus('error');
      setReviewError(error instanceof Error ? error.message : 'Could not submit appeal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-3xl"
      >
        <div className={`rounded-[32px] border ${theme === 'dark' ? 'border-slate-800 bg-slate-900/95' : 'border-slate-200 bg-white'} shadow-2xl overflow-hidden`}>
          <div className={`flex items-center justify-between gap-4 p-6 ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-100'}`}>
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-rose-500">Account Alert</p>
              <h1 className={`mt-3 text-4xl font-semibold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Banned from Reelsy</h1>
            </div>
            <button
              type="button"
              onClick={handleToggleTheme}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${theme === 'dark' ? 'border-slate-700 bg-slate-800 text-slate-100 hover:border-slate-600' : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300'}`}
            >
              {theme === 'dark' ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>

          <div className="grid gap-6 p-8 md:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <div className={`rounded-3xl p-6 ${theme === 'dark' ? 'bg-slate-950/80 border border-slate-800' : 'bg-slate-50 border border-slate-200'}`}>
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-rose-500/10 text-rose-500">
                    <AlertCircle className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-rose-500">Ban Notice</p>
                    <h2 className={`mt-2 text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>You’re not able to access Reelsy right now.</h2>
                  </div>
                </div>

                <p className={`mt-5 text-sm leading-6 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                  Your account was flagged for violating community guidelines. Please review the details below and submit an appeal if you believe this was a mistake.
                </p>
              </div>

              {user?.banReason && (
                <div className={`rounded-3xl p-5 ${theme === 'dark' ? 'bg-slate-950/80 border border-slate-800' : 'bg-white border border-slate-200'}`}>
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-rose-500 mt-1" />
                    <div>
                      <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Reason</p>
                      <p className={`mt-2 text-sm leading-6 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{user.banReason}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {user?.bannedAt && (
                  <div className={`rounded-3xl p-5 ${theme === 'dark' ? 'bg-slate-950/80 border border-slate-800' : 'bg-white border border-slate-200'}`}>
                    <div className="flex items-center gap-3 text-slate-500">
                      <Calendar className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-[0.24em]">Banned on</span>
                    </div>
                    <p className={`mt-3 text-base font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{new Date(user.bannedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                )}

                {user?.bannedUntil && (
                  <div className={`rounded-3xl p-5 ${theme === 'dark' ? 'bg-slate-950/80 border border-slate-800' : 'bg-white border border-slate-200'}`}>
                    <div className="flex items-center gap-3 text-slate-500">
                      <Calendar className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-[0.24em]">Expires</span>
                    </div>
                    <p className={`mt-3 text-base font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{new Date(user.bannedUntil).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                )}
              </div>

              <div className={`rounded-3xl p-5 ${theme === 'dark' ? 'bg-slate-950/80 border border-slate-800' : 'bg-slate-50 border border-slate-200'}`}>
                <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">What happens next</h3>
                <ul className={`mt-4 space-y-3 text-sm leading-6 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                  <li>• You will remain on this page until the review completes.</li>
                  <li>• Content stays private while the ban is active.</li>
                  <li>• A support team member can restore access after review.</li>
                </ul>
              </div>
            </div>

            <div className={`rounded-3xl p-6 ${theme === 'dark' ? 'bg-slate-950/90 border border-slate-800' : 'bg-white border border-slate-200'}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Review Request</p>
                  <h2 className={`mt-2 text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Submit an appeal</h2>
                </div>
                <div className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm ${theme === 'dark' ? 'border-slate-700 text-slate-200 bg-slate-900' : 'border-slate-200 text-slate-700 bg-slate-50'}`}>
                  <Star className="h-4 w-4 text-amber-400" />
                  <span>{rating} / 5</span>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label htmlFor="ban-appeal" className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>Why should the ban be reviewed?</label>
                  <textarea
                    id="ban-appeal"
                    value={reviewText}
                    onChange={(event) => setReviewText(event.target.value)}
                    rows={6}
                    placeholder="Explain your situation and why this ban should be reviewed."
                    className={`mt-3 w-full rounded-3xl border px-4 py-3 text-sm outline-none transition ${theme === 'dark' ? 'border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500' : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'}`}
                  />
                </div>

                <div className="space-y-3">
                  <div className={`flex items-center justify-between gap-3 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                    <p>Appeal strength</p>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setRating(value)}
                          className={`rounded-full p-2 transition ${rating >= value ? 'bg-amber-400 text-slate-950' : theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}
                        >
                          <Star className="h-4 w-4" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {reviewStatus === 'success' && (
                    <div className={`rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-900 ${theme === 'dark' ? 'bg-emerald-500/15 text-emerald-300' : ''}`}>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <p>Your appeal request has been submitted. We will review it shortly.</p>
                      </div>
                    </div>
                  )}

                  {reviewStatus === 'error' && reviewError && (
                    <div className={`rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 ${theme === 'dark' ? 'bg-rose-500/10 text-rose-200 border-rose-600/30' : ''}`}>
                      {reviewError}
                    </div>
                  )}
                </div>

                <div className="grid gap-3 pt-2">
                  <Button
                    onClick={handleSubmitReview}
                    disabled={isSubmitting}
                    className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 rounded-3xl transition"
                  >
                    {isSubmitting ? 'Sending appeal...' : 'Send Appeal Request'}
                  </Button>

                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    className={`w-full rounded-3xl py-3 font-semibold ${theme === 'dark' ? 'border-slate-700 text-slate-200 hover:bg-slate-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                  >
                    Return to login
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600 ${theme === 'dark' ? 'border-slate-800 bg-slate-950 text-slate-300' : ''}`}>
          <p>
            Reelsy monitors accounts closely. If this ban was issued in error, appeal with as much detail as possible so the review team can resolve it faster.
          </p>
          <p className="mt-3">
            Standard review time is up to 24 hours. You will be contacted at <span className="font-semibold">{user?.email}</span>.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default BannedUser;
