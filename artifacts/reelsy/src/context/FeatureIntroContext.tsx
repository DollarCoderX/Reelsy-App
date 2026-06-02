import { createContext, useContext, useState, ReactNode } from "react";
import { hasSeenFeatureIntro, markFeatureIntroSeen } from "@/lib/featureIntro";

export interface FeatureIntro {
  key: string;
  title: string;
  description: string;
  action: () => void;
}

interface FeatureIntroContextType {
  featureIntro: FeatureIntro | null;
  setFeatureIntro: (intro: FeatureIntro | null) => void;
  requestFeatureIntro: (key: string, title: string, description: string, action: () => void) => void;
  handleFeatureIntroClose: () => void;
}

const FeatureIntroContext = createContext<FeatureIntroContextType | undefined>(undefined);

export function FeatureIntroProvider({ children }: { children: ReactNode }) {
  const [featureIntro, setFeatureIntro] = useState<FeatureIntro | null>(null);

  const requestFeatureIntro = (
    key: string,
    title: string,
    description: string,
    action: () => void
  ) => {
    if (hasSeenFeatureIntro(key)) {
      action();
      return;
    }
    setFeatureIntro({ key, title, description, action });
  };

  const handleFeatureIntroClose = () => {
    if (featureIntro?.key) markFeatureIntroSeen(featureIntro.key);
    setFeatureIntro(null);
  };

  return (
    <FeatureIntroContext.Provider value={{ featureIntro, setFeatureIntro, requestFeatureIntro, handleFeatureIntroClose }}>
      {children}
    </FeatureIntroContext.Provider>
  );
}

export function useFeatureIntro() {
  const context = useContext(FeatureIntroContext);
  if (!context) {
    throw new Error("useFeatureIntro must be used within FeatureIntroProvider");
  }
  return context;
}
