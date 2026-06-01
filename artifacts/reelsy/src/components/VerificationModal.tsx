import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle, Check, Loader2, Mail } from "lucide-react";
import { useAppContext } from "@/context/AppContext";

interface VerificationFormData {
  businessName: string;
  businessEmail: string;
  address: string;
  city: string;
  country: string;
  receiveEmailAtExtra: boolean;
}

export const VerificationModal = ({ onClose, onSubmit, onApproved }: {
  onClose: () => void;
  onSubmit: (data: VerificationFormData) => void;
  onApproved?: (approved: boolean) => void;
}) => {
  const isFullscreen = typeof window !== 'undefined' && window.innerWidth < 768;
  const { user } = useAppContext();
  const [step, setStep] = useState<"form" | "review" | "loading" | "result">("form");
  const [formData, setFormData] = useState<VerificationFormData>({
    businessName: "",
    businessEmail: user?.email || "",
    address: "",
    city: "",
    country: "",
    receiveEmailAtExtra: false,
  });
  const [result, setResult] = useState<{ approved: boolean; reason: string }| null>(null);

  const canProceedForm = formData.businessName.trim() && formData.address.trim() && 
                         formData.city.trim() && formData.country.trim();

  const handleSubmitForm = async () => {
    if (!canProceedForm) return;
    setStep("loading");

    // Send verification data to backend for AI analysis
    try {
      const requestBody = {
        businessName: formData.businessName,
        businessEmail: formData.businessEmail || user?.email || "",
        address: formData.address,
        city: formData.city,
        country: formData.country,
        userEmail: user?.email || "",
      };

      // Call backend verification API
      const response = await fetch("/api/verify-business", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error("Response parse error:", parseError);
        throw new Error("Invalid response from server. Please try again.");
      }

      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }

      setResult({
        approved: data.approved,
        reason: data.reason,
      });

      // Always send email to user's email address
      await sendVerificationEmail(user?.email || "", data.approved, data.reason);

      setStep("result");
    } catch (error) {
      console.error("Verification error:", error);
      setResult({
        approved: false,
        reason: error instanceof Error ? error.message : "An error occurred during verification. Please try again.",
      });
      setStep("result");
    }
  };

  const sendVerificationEmail = async (email: string, approved: boolean, reason: string) => {
    try {
      await fetch("/api/send-verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, approved, reason }),
      });
    } catch (error) {
      console.error("Failed to send verification email:", error);
    }
  };

  return (
    <div className={`${isFullscreen ? 'fixed inset-0' : 'absolute inset-0'} bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4`}>
      <motion.div
        initial={isFullscreen ? { y: '100%', opacity: 0 } : { scale: 0.9, opacity: 0 }}
        animate={isFullscreen ? { y: 0, opacity: 1 } : { scale: 1, opacity: 1 }}
        exit={isFullscreen ? { y: '100%', opacity: 0 } : { scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className={`bg-zinc-950 border border-zinc-800 flex flex-col shadow-2xl ${
          isFullscreen 
            ? 'fixed inset-0 rounded-none w-full h-full' 
            : 'rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto'
        }`}
      >
        {/* Header */}
        <div className={`shrink-0 flex items-center justify-between px-6 py-5 sticky top-0 bg-zinc-950 z-10 ${isFullscreen ? 'border-b border-zinc-800/60' : 'border-b border-zinc-800/60'}`}>
          <h2 className={`font-bold text-white ${isFullscreen ? 'text-[20px]' : 'text-[18px]'}`}>Get Verified Badge</h2>
          <button onClick={onClose} className={`${isFullscreen ? 'w-10 h-10' : 'w-8 h-8'} rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-white transition-colors`}>
            <X className={isFullscreen ? 'w-5 h-5' : 'w-4 h-4'} />
          </button>
        </div>

        {/* Form Step */}
        {step === "form" && (
          <div className={`flex-1 overflow-y-auto ${isFullscreen ? 'p-6 space-y-6' : 'p-6 space-y-5'}`}>
            {/* Info Banner */}
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-4 space-y-2">
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <Check className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-blue-300 mb-1">Why Get Verified?</p>
                  <ul className="text-[11px] text-blue-200/80 space-y-1">
                    <li>✓ Build trust with your audience</li>
                    <li>✓ Show a verified badge on all posts</li>
                    <li>✓ Appear in verified creator directories</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[12px] text-zinc-300 leading-relaxed">
                Our AI strictly reviews all information to ensure authenticity and compliance with Reelsy's standards.
              </p>

              {/* Business Name */}
              <div>
                <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-2 block">Business Name *</label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => setFormData((p) => ({ ...p, businessName: e.target.value }))}
                  placeholder="Your official business name"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-[13px] text-white outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 transition-all"
                />
                <p className="text-[10px] text-zinc-500 mt-1.5">Must match your official business registration</p>
              </div>

              {/* Email Section */}
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-2 block">Primary Email</label>
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-[12px] text-zinc-400 outline-none"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1.5">Your Reelsy account email</p>
                </div>

                {/* Extra Business Email */}
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-2 block">Business Email (Optional)</label>
                  <input
                    type="email"
                    value={formData.businessEmail}
                    onChange={(e) => setFormData((p) => ({ ...p, businessEmail: e.target.value }))}
                    placeholder="your-business@company.com"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-[13px] text-white outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 transition-all"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-2 block">Business Address *</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Street address"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-[13px] text-white outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 transition-all"
                />
              </div>

              {/* City & Country */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-2 block">City *</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
                    placeholder="City"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-[13px] text-white outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-2 block">Country *</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData((p) => ({ ...p, country: e.target.value }))}
                    placeholder="Country"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-[13px] text-white outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 transition-all"
                  />
                </div>
              </div>

              {/* Business Image Upload */}
              <div>
                <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-2 block">Business Image *</label>
                <p className="text-[12px] text-zinc-400 leading-relaxed p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                  Add your business logo or storefront image to your profile later. Your profile image will be visible if you post ads in the future.
                </p>
              </div>

              {/* Verification Checklist */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-2.5">
                <p className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">What We Verify</p>
                <div className="space-y-2">
                  <div className="flex gap-2 text-[11px] text-zinc-400">
                    <span className="text-blue-400 font-bold">✓</span> Business name legitimacy
                  </div>
                  <div className="flex gap-2 text-[11px] text-zinc-400">
                    <span className="text-blue-400 font-bold">✓</span> Address validity
                  </div>
                  <div className="flex gap-2 text-[11px] text-zinc-400">
                    <span className="text-blue-400 font-bold">✓</span> Business compliance with Reelsy standards
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-semibold text-amber-300 mb-1">Be Honest</p>
                  <p className="text-[10px] text-amber-200/70 leading-relaxed">
                    Our AI strictly reviews all information. False or misleading details will result in permanent denial.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmitForm}
                disabled={!canProceedForm}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-[13px] transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none"
              >
                {canProceedForm ? "Review & Submit for Verification" : "Fill all required fields"}
              </button>
            </div>
          </div>
        )}

        {/* Loading Step */}
        {step === "loading" && (
          <div className={`flex-1 flex flex-col items-center justify-center ${isFullscreen ? 'gap-8 p-8' : 'gap-6 p-6'}`}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 rounded-full border-4 border-zinc-700 border-t-transparent bg-gradient-to-br from-blue-600/20 to-purple-600/20"
              style={{
                borderTopColor: "rgb(37 99 235 / 1)"
              }}
            />
            
            <div className="space-y-2 text-center">
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[15px] font-bold text-white"
              >
                Verifying your business...
              </motion.p>
              <p className="text-[12px] text-zinc-400">Our AI is analyzing your information</p>
            </div>

            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 8, ease: "easeInOut" }}
              className="h-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full w-full max-w-xs"
            />

            <div className="space-y-2 w-full max-w-xs">
              <div className="flex gap-2">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-[11px] text-zinc-300">Checking business information</span>
              </div>
              <motion.div
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="flex gap-2"
              >
                <Loader2 className="w-4 h-4 text-blue-400 flex-shrink-0 animate-spin" />
                <span className="text-[11px] text-zinc-300">Analyzing image authenticity</span>
              </motion.div>
            </div>

            <p className="text-[11px] text-zinc-500 text-center max-w-xs">
              This usually takes 30-60 seconds. Please don't close this window.
            </p>
          </div>
        )}

        {/* Result Step */}
        {step === "result" && result && (
          <div className={`flex-1 flex flex-col items-center justify-center text-center ${isFullscreen ? 'gap-8 p-8 overflow-y-auto' : 'gap-6 p-6'}`}>
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl ${
                result.approved 
                  ? "bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 ring-2 ring-emerald-500/50" 
                  : "bg-gradient-to-br from-rose-500/30 to-rose-600/20 ring-2 ring-rose-500/50"
              }`}
            >
              {result.approved ? (
                <Check className="w-10 h-10 text-emerald-300" />
              ) : (
                <AlertCircle className="w-10 h-10 text-rose-300" />
              )}
            </motion.div>

            <div className="space-y-3">
              <motion.h3 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`text-2xl font-bold ${result.approved ? "text-emerald-300" : "text-rose-300"}`}
              >
                {result.approved ? "✓ Verified!" : "Verification Status"}
              </motion.h3>
              
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-[13px] text-zinc-300 leading-relaxed max-w-sm"
              >
                {result.reason}
              </motion.p>
            </div>

            {result.approved && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="w-full space-y-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4"
              >
                <div className="flex items-center gap-2 justify-center">
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <p className="text-[11px] text-emerald-300 font-medium">Confirmation email sent</p>
                </div>
                <p className="text-[10px] text-emerald-200/70">
                  Check {formData.businessEmail || user?.email} for details. Your verified badge will appear on all your posts immediately.
                </p>
              </motion.div>
            )}

            {!result.approved && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="w-full space-y-3 bg-rose-500/10 border border-rose-500/30 rounded-xl p-4"
              >
                <p className="text-[11px] font-semibold text-rose-300">What you can do:</p>
                <ul className="text-[10px] text-rose-200/70 space-y-1 text-left">
                  <li>• Review all information for accuracy</li>
                  <li>• Verify business name matches official records</li>
                  <li>• Double-check address and location details</li>
                  <li>• Try again with updated details</li>
                  <li>• Contact support if you believe this is an error</li>
                </ul>
              </motion.div>
            )}

            <button
              onClick={() => {
                if (!result.approved) {
                  setStep("form");
                } else {
                  onApproved?.(result.approved);
                  onClose();
                }
              }}
              className={`w-full mt-4 py-3 rounded-xl font-bold text-[13px] transition-all duration-200 ${
                result.approved
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl"
                  : "bg-gradient-to-r from-zinc-800 to-zinc-700 hover:from-zinc-700 hover:to-zinc-600 text-white shadow-lg hover:shadow-xl"
              }`}
            >
              {result.approved ? "Celebrate! Close" : "Try Again"}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
