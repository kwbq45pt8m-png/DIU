
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Language = 'en' | 'zh-TW';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = '@diu_language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (savedLanguage === 'en' || savedLanguage === 'zh-TW') {
        setLanguageState(savedLanguage);
      }
    } catch (error) {
      console.error('LanguageContext: Error loading language', error);
    }
  };

  const setLanguage = async (lang: Language) => {
    console.log('LanguageContext: Setting language', { language: lang });
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      setLanguageState(lang);
    } catch (error) {
      console.error('LanguageContext: Error saving language', error);
    }
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}

// Translations
const translations: Record<Language, Record<string, string>> = {
  en: {
    // App name
    appName: 'DIU',
    appSubtitle: 'Vent Anonymously',
    
    // Navigation
    home: 'Home',
    profile: 'Profile',
    
    // Common actions
    signIn: 'Sign In',
    signUp: 'Sign Up',
    signOut: 'Sign Out',
    cancel: 'Cancel',
    ok: 'OK',
    continue: 'Continue',
    post: 'Post',
    submit: 'Submit',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    back: 'Back',
    refresh: 'Refresh',
    
    // Auth screen
    authTitle: 'Sign In',
    authSignUpTitle: 'Sign Up',
    emailPlaceholder: 'Email',
    passwordPlaceholder: 'Password',
    namePlaceholder: 'Name (optional)',
    dontHaveAccount: "Don't have an account? Sign Up",
    alreadyHaveAccount: 'Already have an account? Sign In',
    orContinueWith: 'or continue with',
    continueWithGoogle: 'Continue with Google',
    continueWithApple: 'Continue with Apple',
    authError: 'Authentication failed',
    
    // Home screen
    noPosts: 'No posts yet',
    beFirstToVent: 'Be the first to vent!',
    justNow: 'Just now',
    minuteAgo: 'minute ago',
    minutesAgo: 'minutes ago',
    hourAgo: 'hour ago',
    hoursAgo: 'hours ago',
    dayAgo: 'day ago',
    daysAgo: 'days ago',
    
    // Auth modals
    signInToLike: 'Sign in to like posts',
    signInToComment: 'Sign in to comment on posts',
    signInToPost: 'Sign in to create posts',
    createAccountMessage: 'Create an account or sign in to interact with posts',
    
    // Profile screen
    signInToViewProfile: 'Sign in to view your profile',
    signInProfileMessage: 'Create an account or sign in to access your profile, view your posts, and more.',
    aboutDIU: 'About DIU',
    aboutDIUText: 'DIU is an anonymous platform where you can freely express your thoughts, frustrations, and emotions without judgment.',
    guidelines: 'Guidelines',
    guidelineRespect: 'Be respectful to others',
    guidelineNoHate: 'No hate speech or harassment',
    guidelineAnonymous: 'Keep it anonymous and safe',
    signOutConfirm: 'Sign Out?',
    signOutMessage: 'Are you sure you want to sign out of DIU?',
    signingOut: 'Signing Out...',
    
    // Create post screen
    createPost: 'Create Post',
    postPlaceholder: "What's on your mind? Let it out...",
    addPhotoVideo: 'Add Photo/Video',
    videoSelected: 'Video selected',
    charCount: 'characters',
    
    // Post detail screen
    postNotFound: 'Post not found',
    comments: 'Comments',
    noComments: 'No comments yet',
    beFirstToComment: 'Be the first to comment!',
    addComment: 'Add a comment...',
    signInToCommentPlaceholder: 'Sign in to comment',
    signInToCommentTitle: 'Sign in to comment',
    signInToCommentMessage: 'Create an account or sign in to join the conversation',
    
    // Username setup
    chooseUsername: 'Choose Your Username',
    usernameSubtitle: "This is how others will see you on DIU. Choose wisely - it's permanent!",
    usernamePlaceholder: 'Enter username',
    usernameHint: '3-20 characters, letters, numbers, and underscores only',
    usernameRequired: 'Please enter a username',
    usernameMinLength: 'Username must be at least 3 characters',
    usernameInvalidChars: 'Username can only contain letters, numbers, and underscores',
    usernameTaken: 'This username is already taken. Please choose another one.',
    usernameError: 'Failed to set username. Please try again.',
    
    // Errors
    error: 'Error',
    pleaseTryAgain: 'Please try again.',
    somethingWentWrong: 'Something went wrong',
    
    // Language
    language: 'Language',
    english: 'English',
    traditionalChinese: '繁體中文',
  },
  'zh-TW': {
    // App name
    appName: 'DIU',
    appSubtitle: '匿名發洩',
    
    // Navigation
    home: '首頁',
    profile: '個人資料',
    
    // Common actions
    signIn: '登入',
    signUp: '註冊',
    signOut: '登出',
    cancel: '取消',
    ok: '確定',
    continue: '繼續',
    post: '發佈',
    submit: '提交',
    save: '儲存',
    delete: '刪除',
    edit: '編輯',
    back: '返回',
    refresh: '重新整理',
    
    // Auth screen
    authTitle: '登入',
    authSignUpTitle: '註冊',
    emailPlaceholder: '電子郵件',
    passwordPlaceholder: '密碼',
    namePlaceholder: '名稱（選填）',
    dontHaveAccount: '還沒有帳號？立即註冊',
    alreadyHaveAccount: '已有帳號？立即登入',
    orContinueWith: '或使用以下方式繼續',
    continueWithGoogle: '使用 Google 繼續',
    continueWithApple: '使用 Apple 繼續',
    authError: '驗證失敗',
    
    // Home screen
    noPosts: '尚無貼文',
    beFirstToVent: '成為第一個發洩的人！',
    justNow: '剛剛',
    minuteAgo: '分鐘前',
    minutesAgo: '分鐘前',
    hourAgo: '小時前',
    hoursAgo: '小時前',
    dayAgo: '天前',
    daysAgo: '天前',
    
    // Auth modals
    signInToLike: '登入以按讚貼文',
    signInToComment: '登入以評論貼文',
    signInToPost: '登入以建立貼文',
    createAccountMessage: '建立帳號或登入以與貼文互動',
    
    // Profile screen
    signInToViewProfile: '登入以查看您的個人資料',
    signInProfileMessage: '建立帳號或登入以存取您的個人資料、查看您的貼文等。',
    aboutDIU: '關於 DIU',
    aboutDIUText: 'DIU 是一個匿名平台，您可以在這裡自由表達您的想法、挫折和情緒，不受評判。',
    guidelines: '使用守則',
    guidelineRespect: '尊重他人',
    guidelineNoHate: '禁止仇恨言論或騷擾',
    guidelineAnonymous: '保持匿名和安全',
    signOutConfirm: '確定要登出？',
    signOutMessage: '您確定要登出 DIU 嗎？',
    signingOut: '登出中...',
    
    // Create post screen
    createPost: '建立貼文',
    postPlaceholder: '你在想什麼？盡情發洩吧...',
    addPhotoVideo: '新增照片/影片',
    videoSelected: '已選擇影片',
    charCount: '字元',
    
    // Post detail screen
    postNotFound: '找不到貼文',
    comments: '評論',
    noComments: '尚無評論',
    beFirstToComment: '成為第一個評論的人！',
    addComment: '新增評論...',
    signInToCommentPlaceholder: '登入以評論',
    signInToCommentTitle: '登入以評論',
    signInToCommentMessage: '建立帳號或登入以加入對話',
    
    // Username setup
    chooseUsername: '選擇您的使用者名稱',
    usernameSubtitle: '這是其他人在 DIU 上看到您的方式。請謹慎選擇 - 這是永久的！',
    usernamePlaceholder: '輸入使用者名稱',
    usernameHint: '3-20 個字元，僅限字母、數字和底線',
    usernameRequired: '請輸入使用者名稱',
    usernameMinLength: '使用者名稱至少需要 3 個字元',
    usernameInvalidChars: '使用者名稱只能包含字母、數字和底線',
    usernameTaken: '此使用者名稱已被使用。請選擇其他名稱。',
    usernameError: '設定使用者名稱失敗。請重試。',
    
    // Errors
    error: '錯誤',
    pleaseTryAgain: '請重試。',
    somethingWentWrong: '發生錯誤',
    
    // Language
    language: '語言',
    english: 'English',
    traditionalChinese: '繁體中文',
  },
};
