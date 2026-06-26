import React, { useState } from 'react';
import { ChevronRight, AlertTriangle, X, RefreshCw, LogOut, Moon, SunMedium, Send, CheckCircle2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut as supabaseSignOut } from '@/lib/supabase-client';

interface SuspensionNoticeProps {
  username: string;
  email: string;
}

const RESTRICTION_STORAGE_KEY = 'reelsy_account_restriction';

const SuspensionNotice: React.FC<SuspensionNoticeProps> = ({ username, email }) => {
  const { user, setUser, setAppPhase, theme, setTheme } = useAppContext();
  const [showDetails, setShowDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pleaText, setPleaText] = useState('');
  const [error, setError] = useState('');

  const handleToggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const handleLogout = async () => {
    try { await supabaseSignOut(); } catch {}
    localStorage.removeItem('reelsy_user');
    localStorage.removeItem('authToken');
    localStorage.removeItem('supabaseId');
    localStorage.removeItem('reelsy_auth_token');
    sessionStorage.removeItem(RESTRICTION_STORAGE_KEY);
    setUser(null);
    setAppPhase('welcome');
  };

  const collectTelemetry = () => ({
    timestamp: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: typeof navigator !== 'undefined' ? navigator.language : 'unknown',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
    screenResolution: `${typeof window !== 'undefined' ? window.innerWidth : 0}x${typeof window !== 'undefined' ? window.innerHeight : 0}`,
    deviceMemory: (navigator as any)?.deviceMemory || 'unknown',
    deviceCores: (navigator as any)?.hardwareConcurrency || 'unknown',
    connectionType: (navigator as any)?.connection?.effectiveType || 'unknown',
    onLine: typeof navigator !== 'undefined' ? navigator.onLine : true,
  });

  const handleReview = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/suspension-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          email,
          reviewData: {
            type: 'suspension_plea',
            message: pleaText.trim() || 'User requested account review.',
            suspensionReason: user?.suspensionReason,
          },
          telemetry: collectTelemetry(),
        }),
      });

      if (!response.ok) throw new Error('Failed');
      setSubmitted(true);
      setTimeout(() => setShowDetails(false), 2000);
    } catch {
      setError('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-[420px]"
      >
        <div className="overflow-hidden rounded-[32px] border border-border bg-background shadow-2xl">
          {/* Header bar */}
          <div className="px-5 pt-5 pb-4 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-bold text-foreground">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              Account suspended
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-secondary p-1">
              <button
                onClick={handleToggleTheme}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-background text-foreground shadow-sm"
              >
                {theme === 'dark' ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Main content */}
          <div className="px-5 pb-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground mb-2">Access limited</p>
            <h1 className="text-[28px] font-extrabold leading-tight text-foreground">
              Your account has been suspended.
            </h1>
            <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
              {user?.suspensionDetails ||
                'Our safety system flagged suspicious activity on your account. This may be a mistake — you can submit a plea for review.'}
            </p>
          </div>

          {/* Suspension reason card */}
          <div className="mx-5 mb-4 rounded-[22px] bg-secondary/60 border border-border p-4">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Reason</p>
            <p className="text-[13px] text-foreground leading-snug font-medium">
              {user?.suspensionReason || 'Multiple security flags detected. Account under review.'}
            </p>
          </div>

          {/* Actions */}
          <div className="px-5 pb-5 grid gap-2.5">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => { setShowDetails(true); setSubmitted(false); }}
              className="w-full flex items-center justify-between px-5 py-3.5 rounded-full bg-foreground text-background text-[14px] font-bold"
            >
              <span>Submit a plea</span>
              <ChevronRight className="w-4 h-4" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-full border border-border text-[14px] font-semibold text-muted-foreground"
            >
              <LogOut className="w-4 h-4" />
              Return to login
            </motion.button>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-muted-foreground text-center leading-5 px-2">
          Our team reviews pleas within 24–48 hours. You'll receive a response at your registered email.
        </p>
      </motion.div>

      {/* Plea Sheet */}
      <AnimatePresence>
        {showDetails && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
              onClick={() => setShowDetails(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-[28px] px-5 pt-4 pb-10 max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-[16px]">Submit a plea</h2>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowDetails(false)}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              </div>

              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center gap-3 py-10"
                >
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-emerald-500" strokeWidth={2.5} />
                  </div>
                  <p className="font-bold text-[15px]">Plea submitted</p>
                  <p className="text-[12px] text-muted-foreground text-center max-w-[240px]">
                    Our team will review your case and respond within 24–48 hours.
                  </p>
                </motion.div>
              ) : (
                <>
                  <p className="text-[12px] text-muted-foreground mb-4 leading-5">
                    Tell us why you believe this suspension was a mistake. Be specific — it helps our team review your case faster.
                  </p>

                  <div className="rounded-[22px] bg-secondary p-4 mb-3">
                    <p className="text-[12px] font-bold text-foreground mb-2">Your message</p>
                    <textarea
                      value={pleaText}
                      onChange={(e) => setPleaText(e.target.value)}
                      rows={5}
                      placeholder="Explain what happened and why your account should be reinstated..."
                      className="w-full resize-none bg-transparent text-[13px] leading-6 text-foreground outline-none placeholder:text-muted-foreground/50"
                    />
                  </div>

                  {error && (
                    <p className="text-[12px] text-rose-500 mb-3">{error}</p>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleReview}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-foreground text-background text-[14px] font-bold disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {isSubmitting ? 'Submitting...' : 'Send plea'}
                  </motion.button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SuspensionNotice;
