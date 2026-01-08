import { createContext, useContext, useState, useCallback } from 'react';

const PopUpContext = createContext(undefined);

export function PopUpProvider({ children }) {
  const [hasShownPopup, setHasShownPopup] = useState(false);

  const markPopupAsShown = useCallback(() => {
    setHasShownPopup(true);
  }, []);

  const resetPopup = useCallback(() => {
    setHasShownPopup(false);
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
