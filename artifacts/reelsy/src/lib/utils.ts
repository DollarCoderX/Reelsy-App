import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Content age restrictions
export const CONTENT_RATINGS = {
  GENERAL: 0,      // All ages
  PG13: 13,        // 13+
  PG18: 18,        // 18+
  MATURE: 21,      // 21+ (future use)
};

/**
 * Check if user age meets content requirement
 * @param userAge - User's age
 * @param requiredAge - Minimum age required for content
 * @returns true if user can access content, false otherwise
 */
export const isAgeAppropriate = (userAge: number, requiredAge: number): boolean => {
  return userAge >= requiredAge;
};

/**
 * Get age restriction message for restricted content
 * @param userAge - User's current age
 * @returns Message string
 */
export const getAgeRestrictionMessage = (userAge: number): string => {
  return `Sorry, you are not up to the age of this content. You are currently ${userAge} years old.`;
};
