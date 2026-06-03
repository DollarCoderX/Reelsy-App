import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useIPRestriction, IPRestrictionHook } from "@/hooks/useIPRestriction";

export type AppPhase =
  | "splash" | "welcome" | "auth-tos" | "auth-email"
  | "auth-otp" | "auth-password" | "auth-profile" | "auth-interests"
  | "auth-friends" | "auth-permissions" | "account-suspended" | "banned" | "main";

export type Theme = "light" | "dark";
export type Tier = "free" | "premium" | "premium+" | "gold";
export type AppLanguage = "English" | "French" | "Spanish" | "Portuguese" | "Arabic" | "Yoruba" | "Igbo" | "Hausa" | "Swahili" | "German" | "Japanese" | "Korean" | "Chinese (Simplified)" | "Hindi" | "Turkish" | "Dutch";

export interface UserProfile {
  username: string;
  nickname: string;
  age: number;
  birthday?: string;
  avatar?: string;
  interests?: string[];
  bio?: string;
  email?:string;
  friendPolicy?: "open" | "request-only";
  coverImage?: string;
  verified?: boolean; // Verified badge for businesses (not a tier, just a flag)
  isSuspended?: boolean;
  suspensionReason?: string;
  suspensionDetails?: string;
  isBanned?: boolean;
  banReason?: string;
  bannedAt?: string;
  bannedUntil?: string;
  supabaseId?: string; // For real-time polling
}

export interface ChatWallpaper {
  type: "solid" | "unsplash" | "video";
  value: string; // hex color or image URL or video URL
  isLooping?: boolean;
}

export interface Draft {
  id: string;
  content: string;
  createdAt: number; // timestamp
}


interface AppContextType {
  appPhase: AppPhase;
  setAppPhase: (phase: AppPhase) => void;
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (key: string) => string;
  tier: Tier;
  setTier: (tier: Tier) => void;
  reelsyNumber: string | null;
  setReelsyNumber: (n: string | null) => void;
  authEmail: string | null;
  setAuthEmail: (email: string | null) => void;
  authPassword: string | null;
  setAuthPassword: (password: string | null) => void;
  ip: IPRestrictionHook;
  chatWallpaper: ChatWallpaper | null;
  setChatWallpaper: (wallpaper: ChatWallpaper | null) => void;
  draftTimestamps: Record<string, number>; // track draft creation times
  setDraftTimestamps: (timestamps: Record<string, number>) => void;
  archivedMessages: Set<string>; // track archived message IDs
  setArchivedMessages: (messages: Set<string>) => void;
  draftFirstTimeSeen: boolean;
  setDraftFirstTimeSeen: (seen: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LANGUAGE_CODES: Record<AppLanguage, string> = {
  English: "en",
  French: "fr",
  Spanish: "es",
  Portuguese: "pt",
  Arabic: "ar",
  Yoruba: "yo",
  Igbo: "ig",
  Hausa: "ha",
  Swahili: "sw",
  German: "de",
  Japanese: "ja",
  Korean: "ko",
  "Chinese (Simplified)": "zh-CN",
  Hindi: "hi",
  Turkish: "tr",
  Dutch: "nl",
};

const TRANSLATIONS: Record<AppLanguage, Record<string, string>> = {
  English: {},
  French: {
    Home: "Accueil", Search: "Recherche", Chat: "Discussion", Activity: "Activite", Settings: "Parametres",
    Appearance: "Apparence", Account: "Compte", Preferences: "Preferences", Security: "Securite", Storage: "Stockage", About: "A propos",
    "Dark Mode": "Mode sombre", Enabled: "Active", Disabled: "Desactive", "Edit Profile": "Modifier le profil", Email: "E-mail", Privacy: "Confidentialite",
    Notifications: "Notifications", Language: "Langue", "Post Retention": "Conservation des posts", "Change Password": "Changer le mot de passe",
    "Two-Factor Auth": "Authentification a deux facteurs", "Beta Features": "Fonctions beta", "App Storage": "Stockage de l'app",
    "Help Center": "Centre d'aide", "Contact Support": "Contacter le support", "Terms of Service": "Conditions d'utilisation", "Rate Reelsy": "Noter Reelsy", "Sign Out": "Se deconnecter",
    "Apply Language": "Appliquer la langue", "Applied!": "Applique!"
  },
  Spanish: {
    Home: "Inicio", Search: "Buscar", Chat: "Chat", Activity: "Actividad", Settings: "Ajustes",
    Appearance: "Apariencia", Account: "Cuenta", Preferences: "Preferencias", Security: "Seguridad", Storage: "Almacenamiento", About: "Acerca de",
    "Dark Mode": "Modo oscuro", Enabled: "Activado", Disabled: "Desactivado", "Edit Profile": "Editar perfil", Email: "Correo", Privacy: "Privacidad",
    Notifications: "Notificaciones", Language: "Idioma", "Post Retention": "Retencion de posts", "Change Password": "Cambiar contrasena",
    "Two-Factor Auth": "Autenticacion de dos factores", "Beta Features": "Funciones beta", "App Storage": "Almacenamiento de la app",
    "Help Center": "Centro de ayuda", "Contact Support": "Contactar soporte", "Terms of Service": "Terminos de servicio", "Rate Reelsy": "Calificar Reelsy", "Sign Out": "Cerrar sesion",
    "Apply Language": "Aplicar idioma", "Applied!": "Aplicado!"
  },
  Portuguese: {
    Home: "Inicio", Search: "Pesquisar", Chat: "Chat", Activity: "Atividade", Settings: "Definicoes",
    Appearance: "Aparencia", Account: "Conta", Preferences: "Preferencias", Security: "Seguranca", Storage: "Armazenamento", About: "Sobre",
    "Dark Mode": "Modo escuro", Enabled: "Ativado", Disabled: "Desativado", "Edit Profile": "Editar perfil", Email: "Email", Privacy: "Privacidade",
    Notifications: "Notificacoes", Language: "Idioma", "Post Retention": "Retencao de posts", "Change Password": "Alterar senha",
    "Two-Factor Auth": "Autenticacao de dois fatores", "Beta Features": "Recursos beta", "App Storage": "Armazenamento do app",
    "Help Center": "Central de ajuda", "Contact Support": "Contactar suporte", "Terms of Service": "Termos de servico", "Rate Reelsy": "Avaliar Reelsy", "Sign Out": "Sair",
    "Apply Language": "Aplicar idioma", "Applied!": "Aplicado!"
  },
  Arabic: {
    Home: "الرئيسية", Search: "بحث", Chat: "دردشة", Activity: "النشاط", Settings: "الإعدادات",
    Appearance: "المظهر", Account: "الحساب", Preferences: "التفضيلات", Security: "الأمان", Storage: "التخزين", About: "حول",
    "Dark Mode": "الوضع الداكن", Enabled: "مفعل", Disabled: "معطل", "Edit Profile": "تعديل الملف", Email: "البريد", Privacy: "الخصوصية",
    Notifications: "الإشعارات", Language: "اللغة", "Post Retention": "مدة المنشورات", "Change Password": "تغيير كلمة المرور",
    "Two-Factor Auth": "التحقق بخطوتين", "Beta Features": "ميزات تجريبية", "App Storage": "تخزين التطبيق",
    "Help Center": "مركز المساعدة", "Contact Support": "الدعم", "Terms of Service": "شروط الخدمة", "Rate Reelsy": "قيم Reelsy", "Sign Out": "تسجيل الخروج",
    "Apply Language": "تطبيق اللغة", "Applied!": "تم التطبيق!"
  },
  Yoruba: {
    Home: "Ile", Search: "Wa", Chat: "Iwiregbe", Activity: "Ise", Settings: "Eto",
    Appearance: "Irisi", Account: "Akaunti", Preferences: "Ayanfe", Security: "Aabo", Storage: "Ibi ipamo", About: "Nipa",
    "Dark Mode": "Ipo dudu", Enabled: "Ti tan", Disabled: "Ti pa", "Edit Profile": "Satunse profaili", Email: "Imeeli", Privacy: "Asiri",
    Notifications: "Iwifunni", Language: "Ede", "Post Retention": "Akoko post", "Change Password": "Yi oroigbaniwole pada",
    "Two-Factor Auth": "Aabo ipele meji", "Beta Features": "Awon ẹya beta", "App Storage": "Ibi ipamo app",
    "Help Center": "Iranlowo", "Contact Support": "Kan support", "Terms of Service": "Ofin lilo", "Rate Reelsy": "Se ayewo Reelsy", "Sign Out": "Jade",
    "Apply Language": "Lo ede yii", "Applied!": "Ti lo!"
  },
  Igbo: {
    Home: "Ulo", Search: "Choo", Chat: "Mkparita", Activity: "Omume", Settings: "Ntọala",
    Appearance: "Odidi", Account: "Akauntu", Preferences: "Nhọrọ", Security: "Nchekwa", Storage: "Nchekwa faịlụ", About: "Banyere",
    "Dark Mode": "Ọnọdụ ojii", Enabled: "Gbanyere", Disabled: "Gbanyụrụ", "Edit Profile": "Dezie profaịlụ", Email: "Email", Privacy: "Nzuzo",
    Notifications: "Ozi ngosi", Language: "Asụsụ", "Post Retention": "Oge post", "Change Password": "Gbanwee paswọọdụ",
    "Two-Factor Auth": "Nche abụọ", "Beta Features": "Njirimara beta", "App Storage": "Nchekwa app",
    "Help Center": "Ebe enyemaka", "Contact Support": "Kpọtụrụ nkwado", "Terms of Service": "Usoro ọrụ", "Rate Reelsy": "Tulee Reelsy", "Sign Out": "Pụọ",
    "Apply Language": "Tinye asụsụ", "Applied!": "Etinyere!"
  },
  Hausa: {
    Home: "Gida", Search: "Bincike", Chat: "Hira", Activity: "Aiki", Settings: "Saituna",
    Appearance: "Bayyani", Account: "Asusu", Preferences: "Zabi", Security: "Tsaro", Storage: "Ajiya", About: "Game da",
    "Dark Mode": "Yanayin duhu", Enabled: "An kunna", Disabled: "An kashe", "Edit Profile": "Gyara bayanai", Email: "Imel", Privacy: "Sirri",
    Notifications: "Sanarwa", Language: "Harshe", "Post Retention": "Adana post", "Change Password": "Canza kalmar sirri",
    "Two-Factor Auth": "Tabbaci biyu", "Beta Features": "Sabbin fasali", "App Storage": "Ajiya app",
    "Help Center": "Taimako", "Contact Support": "Tuntubi tallafi", "Terms of Service": "Sharuddan aiki", "Rate Reelsy": "Kimanta Reelsy", "Sign Out": "Fita",
    "Apply Language": "Aiwatar da harshe", "Applied!": "An aiwatar!"
  },
  Swahili: {
    Home: "Nyumbani", Search: "Tafuta", Chat: "Gumzo", Activity: "Shughuli", Settings: "Mipangilio",
    Appearance: "Muonekano", Account: "Akaunti", Preferences: "Mapendeleo", Security: "Usalama", Storage: "Hifadhi", About: "Kuhusu",
    "Dark Mode": "Hali nyeusi", Enabled: "Imewashwa", Disabled: "Imezimwa", "Edit Profile": "Hariri wasifu", Email: "Barua pepe", Privacy: "Faragha",
    Notifications: "Arifa", Language: "Lugha", "Post Retention": "Muda wa machapisho", "Change Password": "Badili nenosiri",
    "Two-Factor Auth": "Uthibitisho wa hatua mbili", "Beta Features": "Vipengele beta", "App Storage": "Hifadhi ya app",
    "Help Center": "Kituo cha msaada", "Contact Support": "Wasiliana na msaada", "Terms of Service": "Masharti", "Rate Reelsy": "Kadiria Reelsy", "Sign Out": "Ondoka",
    "Apply Language": "Tumia lugha", "Applied!": "Imetumika!"
  },
  German: {
    Home: "Start", Search: "Suche", Chat: "Chat", Activity: "Aktivitat", Settings: "Einstellungen",
    Appearance: "Darstellung", Account: "Konto", Preferences: "Vorlieben", Security: "Sicherheit", Storage: "Speicher", About: "Info",
    "Dark Mode": "Dunkelmodus", Enabled: "Aktiv", Disabled: "Inaktiv", "Edit Profile": "Profil bearbeiten", Email: "E-Mail", Privacy: "Datenschutz",
    Notifications: "Benachrichtigungen", Language: "Sprache", "Post Retention": "Post-Aufbewahrung", "Change Password": "Passwort andern",
    "Two-Factor Auth": "Zwei-Faktor-Auth", "Beta Features": "Beta-Funktionen", "App Storage": "App-Speicher",
    "Help Center": "Hilfe", "Contact Support": "Support kontaktieren", "Terms of Service": "Nutzungsbedingungen", "Rate Reelsy": "Reelsy bewerten", "Sign Out": "Abmelden",
    "Apply Language": "Sprache anwenden", "Applied!": "Angewendet!"
  },
  Japanese: {
    Home: "ホーム", Search: "検索", Chat: "チャット", Activity: "アクティビティ", Settings: "設定",
    Appearance: "表示", Account: "アカウント", Preferences: "設定項目", Security: "セキュリティ", Storage: "ストレージ", About: "情報",
    "Dark Mode": "ダークモード", Enabled: "オン", Disabled: "オフ", "Edit Profile": "プロフィール編集", Email: "メール", Privacy: "プライバシー",
    Notifications: "通知", Language: "言語", "Post Retention": "投稿保持", "Change Password": "パスワード変更",
    "Two-Factor Auth": "二段階認証", "Beta Features": "ベータ機能", "App Storage": "アプリ容量",
    "Help Center": "ヘルプ", "Contact Support": "サポート", "Terms of Service": "利用規約", "Rate Reelsy": "Reelsyを評価", "Sign Out": "ログアウト",
    "Apply Language": "言語を適用", "Applied!": "適用しました"
  },
  Korean: {
    Home: "홈", Search: "검색", Chat: "채팅", Activity: "활동", Settings: "설정",
    Appearance: "화면", Account: "계정", Preferences: "환경설정", Security: "보안", Storage: "저장공간", About: "정보",
    "Dark Mode": "다크 모드", Enabled: "켜짐", Disabled: "꺼짐", "Edit Profile": "프로필 편집", Email: "이메일", Privacy: "개인정보",
    Notifications: "알림", Language: "언어", "Post Retention": "게시물 보관", "Change Password": "비밀번호 변경",
    "Two-Factor Auth": "2단계 인증", "Beta Features": "베타 기능", "App Storage": "앱 저장공간",
    "Help Center": "도움말", "Contact Support": "지원 문의", "Terms of Service": "서비스 약관", "Rate Reelsy": "Reelsy 평가", "Sign Out": "로그아웃",
    "Apply Language": "언어 적용", "Applied!": "적용됨"
  },
  "Chinese (Simplified)": {
    Home: "首页", Search: "搜索", Chat: "聊天", Activity: "动态", Settings: "设置",
    Appearance: "外观", Account: "账号", Preferences: "偏好", Security: "安全", Storage: "存储", About: "关于",
    "Dark Mode": "深色模式", Enabled: "已开启", Disabled: "已关闭", "Edit Profile": "编辑资料", Email: "邮箱", Privacy: "隐私",
    Notifications: "通知", Language: "语言", "Post Retention": "帖子保留", "Change Password": "修改密码",
    "Two-Factor Auth": "双重验证", "Beta Features": "测试功能", "App Storage": "应用存储",
    "Help Center": "帮助中心", "Contact Support": "联系支持", "Terms of Service": "服务条款", "Rate Reelsy": "评价 Reelsy", "Sign Out": "退出登录",
    "Apply Language": "应用语言", "Applied!": "已应用"
  },
  Hindi: {
    Home: "होम", Search: "खोज", Chat: "चैट", Activity: "गतिविधि", Settings: "सेटिंग्स",
    Appearance: "दिखावट", Account: "खाता", Preferences: "पसंद", Security: "सुरक्षा", Storage: "स्टोरेज", About: "बारे में",
    "Dark Mode": "डार्क मोड", Enabled: "चालू", Disabled: "बंद", "Edit Profile": "प्रोफाइल संपादित करें", Email: "ईमेल", Privacy: "गोपनीयता",
    Notifications: "सूचनाएं", Language: "भाषा", "Post Retention": "पोस्ट अवधि", "Change Password": "पासवर्ड बदलें",
    "Two-Factor Auth": "दो-चरण सुरक्षा", "Beta Features": "बीटा फीचर", "App Storage": "ऐप स्टोरेज",
    "Help Center": "सहायता केंद्र", "Contact Support": "सपोर्ट से संपर्क", "Terms of Service": "सेवा शर्तें", "Rate Reelsy": "Reelsy रेट करें", "Sign Out": "साइन आउट",
    "Apply Language": "भाषा लागू करें", "Applied!": "लागू हुआ"
  },
  Turkish: {
    Home: "Ana Sayfa", Search: "Ara", Chat: "Sohbet", Activity: "Etkinlik", Settings: "Ayarlar",
    Appearance: "Gorunum", Account: "Hesap", Preferences: "Tercihler", Security: "Guvenlik", Storage: "Depolama", About: "Hakkinda",
    "Dark Mode": "Koyu mod", Enabled: "Acik", Disabled: "Kapali", "Edit Profile": "Profili duzenle", Email: "E-posta", Privacy: "Gizlilik",
    Notifications: "Bildirimler", Language: "Dil", "Post Retention": "Post saklama", "Change Password": "Sifre degistir",
    "Two-Factor Auth": "Iki adimli dogrulama", "Beta Features": "Beta ozellikler", "App Storage": "Uygulama depolama",
    "Help Center": "Yardim merkezi", "Contact Support": "Destek iletisim", "Terms of Service": "Hizmet sartlari", "Rate Reelsy": "Reelsy puanla", "Sign Out": "Cikis yap",
    "Apply Language": "Dili uygula", "Applied!": "Uygulandi!"
  },
  Dutch: {
    Home: "Home", Search: "Zoeken", Chat: "Chat", Activity: "Activiteit", Settings: "Instellingen",
    Appearance: "Weergave", Account: "Account", Preferences: "Voorkeuren", Security: "Beveiliging", Storage: "Opslag", About: "Over",
    "Dark Mode": "Donkere modus", Enabled: "Aan", Disabled: "Uit", "Edit Profile": "Profiel bewerken", Email: "E-mail", Privacy: "Privacy",
    Notifications: "Meldingen", Language: "Taal", "Post Retention": "Post bewaren", "Change Password": "Wachtwoord wijzigen",
    "Two-Factor Auth": "Tweestapsverificatie", "Beta Features": "Beta functies", "App Storage": "App opslag",
    "Help Center": "Helpcentrum", "Contact Support": "Support contacteren", "Terms of Service": "Servicevoorwaarden", "Rate Reelsy": "Reelsy beoordelen", "Sign Out": "Uitloggen",
    "Apply Language": "Taal toepassen", "Applied!": "Toegepast!"
  },
};

const translate = (language: AppLanguage, key: string) => TRANSLATIONS[language]?.[key] || key;

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [appPhase, setAppPhase] = useState<AppPhase>("splash");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [theme, setTheme] = useState<Theme>("light");
  const [language, setLanguage] = useState<AppLanguage>("English");
  const [tier, setTier] = useState<Tier>("free");
  const [reelsyNumber, setReelsyNumber] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authPassword, setAuthPassword] = useState<string | null>(null);
  const [chatWallpaper, setChatWallpaper] = useState<ChatWallpaper | null>(null);
  const [draftTimestamps, setDraftTimestamps] = useState<Record<string, number>>({});
  const [archivedMessages, setArchivedMessages] = useState<Set<string>>(new Set());
  const [draftFirstTimeSeen, setDraftFirstTimeSeen] = useState(false);
  const ip = useIPRestriction();

  useEffect(() => {
    const storedUser = localStorage.getItem("reelsy_user");
    if (storedUser) { setUser(JSON.parse(storedUser)); setAppPhase("main"); }
    const storedTheme = localStorage.getItem("reelsy_theme") as Theme | null;
    if (storedTheme) setTheme(storedTheme);
    else setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const storedLanguage = localStorage.getItem("reelsy_language") as AppLanguage | null;
    if (storedLanguage && storedLanguage in LANGUAGE_CODES) setLanguage(storedLanguage);
    const storedTier = localStorage.getItem("reelsy_tier") as Tier | null;
    if (storedTier) setTier(storedTier);
    const storedNumber = localStorage.getItem("reelsy_number");
    if (storedNumber) setReelsyNumber(storedNumber);
    const storedWallpaper = localStorage.getItem("reelsy_chat_wallpaper");
    if (storedWallpaper) setChatWallpaper(JSON.parse(storedWallpaper));
    const storedDrafts = localStorage.getItem("reelsy_draft_timestamps");
    if (storedDrafts) setDraftTimestamps(JSON.parse(storedDrafts));
    const storedDraftSeen = localStorage.getItem("reelsy_draft_seen");
    if (storedDraftSeen) setDraftFirstTimeSeen(JSON.parse(storedDraftSeen));
    
    // Clean up drafts older than 2 days
    const now = Date.now();
    const TWO_DAYS_MS = 172800000; // 2 days in milliseconds
    const existingDrafts = localStorage.getItem("reelsy_drafts");
    if (existingDrafts) {
      try {
        const drafts = JSON.parse(existingDrafts);
        const validDrafts = drafts.filter((d: any) => now - d.createdAt <= TWO_DAYS_MS);
        if (validDrafts.length !== drafts.length) {
          localStorage.setItem("reelsy_drafts", JSON.stringify(validDrafts));
        }
      } catch (e) {
        console.error("Error cleaning up drafts:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (user) localStorage.setItem("reelsy_user", JSON.stringify(user));
    else localStorage.removeItem("reelsy_user");
  }, [user]);

  useEffect(() => {
    localStorage.setItem("reelsy_theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.dataset.theme = theme;
    document.body.style.backgroundColor = theme === "dark" ? "#000000" : "#ffffff";
    document.body.style.color = theme === "dark" ? "#ffffff" : "#000000";
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("reelsy_language", language);
    document.documentElement.lang = LANGUAGE_CODES[language] || "en";
    document.documentElement.dir = language === "Arabic" ? "rtl" : "ltr";
  }, [language]);

  useEffect(() => {
    localStorage.setItem("reelsy_tier", tier);
  }, [tier]);

  useEffect(() => {
    if (reelsyNumber) localStorage.setItem("reelsy_number", reelsyNumber);
    else localStorage.removeItem("reelsy_number");
  }, [reelsyNumber]);

  useEffect(() => {
    localStorage.setItem("reelsy_chat_wallpaper", JSON.stringify(chatWallpaper));
  }, [chatWallpaper]);

  useEffect(() => {
    localStorage.setItem("reelsy_draft_timestamps", JSON.stringify(draftTimestamps));
  }, [draftTimestamps]);

  useEffect(() => {
    localStorage.setItem("reelsy_draft_seen", JSON.stringify(draftFirstTimeSeen));
  }, [draftFirstTimeSeen]);

  return (
    <AppContext.Provider value={{
      appPhase, setAppPhase, user, setUser, theme, setTheme, tier, setTier,
      language, setLanguage, t: (key: string) => translate(language, key),
      reelsyNumber, setReelsyNumber, authEmail, setAuthEmail, authPassword, setAuthPassword, ip,
      chatWallpaper, setChatWallpaper, draftTimestamps, setDraftTimestamps,
      archivedMessages, setArchivedMessages, draftFirstTimeSeen, setDraftFirstTimeSeen
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
};
