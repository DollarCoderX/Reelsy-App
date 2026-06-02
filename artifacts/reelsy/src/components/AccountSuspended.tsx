import React, { useState } from 'react';
import { ChevronRight, AlertCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface SuspensionNoticeProps {
  username: string;
  email: string;
}

const SuspensionNotice: React.FC<SuspensionNoticeProps> = ({ username, email }) => {
  const { user } = useAppContext();
  const { toast } = useToast();
  const [showDetails, setShowDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLearnMore = () => {
    setShowDetails(true);
  };

  const handleReview = async () => {
    try {
      setIsSubmitting(true);

      // Collect telemetry data
      const telemetry = collectTelemetry();

      const response = await fetch('/api/auth/suspension-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          email,
          telemetry,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit review');
      }

      toast({
        title: 'Review Request Submitted',
        description: 'Our team will investigate and review your account suspension.',
      });

      setShowDetails(false);
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit review request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const collectTelemetry = () => {
    const now = new Date();
    const navigator_ = typeof navigator !== 'undefined' ? navigator : null;

    return {
      timestamp: now.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: typeof navigator !== 'undefined' ? navigator.language : 'unknown',
      userAgent: navigator_?.userAgent || 'unknown',
      platform: navigator_?.platform || 'unknown',
      screenResolution: `${typeof window !== 'undefined' ? window.innerWidth : 0}x${typeof window !== 'undefined' ? window.innerHeight : 0}`,
      deviceMemory: (navigator_ as any)?.deviceMemory || 'unknown',
      deviceCores: (navigator_ as any)?.hardwareConcurrency || 'unknown',
      connectionType: (navigator_ as any)?.connection?.effectiveType || 'unknown',
      onLine: typeof navigator !== 'undefined' ? navigator.onLine : true,
      // Account info
      tier: 'free',
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <AlertCircle className="w-16 h-16 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Account Suspended</h1>
          <p className="text-gray-600">
            Your account has been suspended due to security concerns.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <p className="text-gray-700 mb-4">
            {user?.suspensionDetails || 
            'Your account was suspended due to multiple security violations detected by our system.'}
          </p>

          {/* Learn More Button */}
          <button
            onClick={handleLearnMore}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-between mb-3 transition-colors"
          >
            <span>Learn More</span>
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Review Button */}
          <button
            onClick={handleReview}
            disabled={isSubmitting}
            className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <span>Request Review</span>
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            💡 <strong>Tip:</strong> Click "Request Review" to submit your account for investigation. Our team will examine your case and get back to you.
          </p>
        </div>
      </motion.div>

      {/* Details Modal */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50"
            onClick={() => setShowDetails(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Suspension Details</h2>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Reason</h3>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">
                    {user?.suspensionReason || 'Multiple security violations'}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Details</h3>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded-lg text-sm leading-relaxed">
                    {user?.suspensionDetails || 
                    'Your account was detected engaging in suspicious activities. This includes multiple security flags that violated our community standards.'}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Next Steps</h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-600 text-sm">
                    <li>Review the suspension reason above</li>
                    <li>Click "Request Review" to submit your case</li>
                    <li>Our team will investigate and respond within 24-48 hours</li>
                    <li>You'll receive an email with our decision</li>
                  </ol>
                </div>
              </div>

              <button
                onClick={() => setShowDetails(false)}
                className="w-full mt-6 bg-gray-900 text-white font-semibold py-3 px-4 rounded-lg"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SuspensionNotice;
