import {createContext, useContext, useState, useEffect} from 'react';

const NavigationContext = createContext();

export const NavigationProvider = ({children}) => {
  const [lastCollectionPath, setLastCollectionPath] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('lastCollectionPath');
    if (stored) setLastCollectionPath(stored);
  }, []);

  useEffect(() => {
    if (lastCollectionPath) {
      localStorage.setItem('lastCollectionPath', lastCollectionPath);
    }
  }, [lastCollectionPath]);

  return (
    <NavigationContext.Provider
      value={{lastCollectionPath, setLastCollectionPath}}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigationContext = () => useContext(NavigationContext);
