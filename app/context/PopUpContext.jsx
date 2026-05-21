import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const PopUpContext = createContext(undefined);

const STORAGE_KEY = 'oh_popup_shown';
const EXPIRY_MS = 3 * 60 * 60 * 1000; // 3 hours

function hasValidDismissal() {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return false;
  return Date.now() - parseInt(stored, 10) < EXPIRY_MS;
}

export function PopUpProvider({ children }) {
  const [hasShownPopup, setHasShownPopup] = useState(false);

  useEffect(() => {
    setHasShownPopup(hasValidDismissal());
  }, []);

  const markPopupAsShown = useCallback(() => {
    setHasShownPopup(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    }
  }, []);

  const resetPopup = useCallback(() => {
    setHasShownPopup(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const shouldShowPopup = useCallback(() => {
    return !hasShownPopup;
  }, [hasShownPopup]);

  return (
    <PopUpContext.Provider
      value={{
        hasShownPopup,
        markPopupAsShown,
        resetPopup,
        shouldShowPopup
      }}
    >
      {children}
    </PopUpContext.Provider>
  );
}

export function usePopUp() {
  const context = useContext(PopUpContext);
  if (context === undefined) {
    throw new Error('usePopUp must be used within a PopUpProvider');
  }
  return context;
}
