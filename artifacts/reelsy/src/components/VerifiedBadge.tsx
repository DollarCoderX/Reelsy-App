import { CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Verified Badge Component
 * Shows a blue verified icon next to verified business usernames
 */
export const VerifiedBadge = ({ isVerified, size = "sm" }: {
  isVerified?: boolean;
  size?: "xs" | "sm" | "md";
}) => {
  if (!isVerified) return null;

  const sizeMap = {
    xs: { icon: 12, gap: 2 },
    sm: { icon: 14, gap: 3 },
    md: { icon: 16, gap: 4 },
  };

  const config = sizeMap[size];

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.1 }}
      className="inline-flex items-center gap-[${config.gap}px]"
    >
      <CheckCircle
        size={config.icon}
        className="fill-blue-500 text-blue-600"
        strokeWidth={2.5}
      />
    </motion.div>
  );
};

/**
 * Verified Badge with Username
 * Shows @username with verification badge
 */
export const VerifiedUsername = ({ username, isVerified, className = "" }: {
  username: string;
  isVerified?: boolean;
  className?: string;
}) => {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="font-semibold">{username}</span>
      {isVerified && <VerifiedBadge isVerified={true} size="xs" />}
    </span>
  );
};
