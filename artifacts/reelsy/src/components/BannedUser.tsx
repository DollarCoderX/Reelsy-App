import { useEffect } from 'react';
import { AlertCircle, Mail, Calendar, FileText } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { Button } from './ui/button';
import { motion } from 'framer-motion';

/**
 * BannedUser component - Displayed when user is banned
 * Shows ban reason, ban date, and contact/appeal option
 */
export const BannedUser = () => {
  const { user, setAppPhase } = useAppContext();

  useEffect(() => {
    // Make sure user stays on this page
    if (!user?.isBanned && !user?.isSuspended) {
      // If not banned, redirect to main
      setAppPhase('main');
    }
  }, [user, setAppPhase]);

  const handleAppeal = async () => {
    // TODO: Open appeal form or contact support
    window.open('mailto:support@reelsy.app?subject=Ban Appeal', '_blank');
  };

  const handleLogout = () => {
    localStorage.removeItem('reelsy_user');
    localStorage.removeItem('authToken');
    localStorage.removeItem('supabaseId');
    setAppPhase('auth-login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header with red accent */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 p-8 text-center">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4"
            >
              <AlertCircle className="w-8 h-8 text-red-500" />
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-2">Account Banned</h1>
            <p className="text-red-100">Your account has been suspended</p>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            {/* Ban Reason */}
            {user?.banReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-900 mb-1">Reason</h3>
                    <p className="text-red-800 text-sm">{user.banReason}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Ban Details */}
            <div className="space-y-3">
              {user?.bannedAt && (
                <div className="flex items-center gap-3 text-gray-700">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div className="text-sm">
                    <p className="text-gray-500">Banned on</p>
                    <p className="font-medium">
                      {new Date(user.bannedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              )}

              {user?.bannedUntil && (
                <div className="flex items-center gap-3 text-gray-700">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div className="text-sm">
                    <p className="text-gray-500">Expires</p>
                    <p className="font-medium">
                      {new Date(user.bannedUntil).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Message */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">What happens now?</h3>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>• You cannot access your account</li>
                <li>• Your content remains private</li>
                <li>• You can appeal this decision</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-4">
              <Button
                onClick={handleAppeal}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition"
              >
                <Mail className="w-5 h-5" />
                Request Review / Appeal
              </Button>

              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3 rounded-lg transition"
              >
                Go Back to Login
              </Button>
            </div>

            {/* Contact Info */}
            <div className="border-t pt-4 text-center text-sm text-gray-600">
              <p>Questions? Contact support:</p>
              <a
                href="mailto:support@reelsy.app"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                support@reelsy.app
              </a>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center mt-6 text-sm text-gray-600">
          <p>This action was taken to maintain community standards.</p>
          <p className="mt-2">
            If you believe this is a mistake, please appeal your ban.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default BannedUser;
