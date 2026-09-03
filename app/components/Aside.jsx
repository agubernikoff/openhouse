import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

/**
 * A side bar component with Overlay
 * @example
 * ```jsx
 * <Aside type="search" heading="SEARCH">
 *  <input type="search" />
 *  ...
 * </Aside>
 * ```
 * @param {{
 *   children?: React.ReactNode;
 *   type: AsideType;
 *   heading: React.ReactNode;
 * }}
 */
export function Aside({children, heading, type}) {
  const {type: activeType, close} = useAside();
  const expanded = type === activeType;
  const isMobileMenu = type === 'mobile';

  useEffect(() => {
    const abortController = new AbortController();

    if (expanded) {
      document.addEventListener(
        'keydown',
        function handler(event) {
          if (event.key === 'Escape') {
            close();
          }
        },
        {signal: abortController.signal},
      );
    }
    return () => abortController.abort();
  }, [close, expanded]);

  if (isMobileMenu) {
    return (
      <div
        aria-modal
        className={`overlay mobile-menu-overlay ${expanded ? 'expanded' : ''}`}
        role="dialog"
      >
        <aside className="mobile-menu-aside">
          <main>{children}</main>
        </aside>
      </div>
    );
  }

  return (
    <div
      aria-modal
      className={`overlay ${expanded ? 'expanded' : ''}`}
      role="dialog"
    >
      <button className="close-outside" onClick={close} />
      <aside>
        <header>
          <h3>{heading}</h3>
          <button className="close reset" onClick={close} aria-label="Close">
            &times;
          </button>
        </header>
        <main>{children}</main>
      </aside>
    </div>
  );
}

const AsideContext = createContext(null);

Aside.Provider = function AsideProvider({children}) {
  const [state, setState] = useState({type: 'closed', method: null});

  // Stable references are load-bearing here, not just an optimization: a
  // couple of effects elsewhere (Header.jsx) list `close` in their dependency
  // array. If open/close were recreated on every render (as they were
  // before), any unrelated re-render of an ancestor would give those effects
  // a "new" close function, making them tear down and re-run — which
  // re-focuses the panel's first element, which (for Search) re-triggers its
  // predictive-search fetch, which causes another re-render, forever.
  const open = useCallback(
    (type, method = 'click') => setState({type, method}),
    [],
  );
  const close = useCallback(() => setState({type: 'closed', method: null}), []);

  const value = useMemo(
    () => ({
      type: state.type,
      // 'hover' = passive reveal (mouse hover or Tab landing on the
      // trigger) — never steals focus or traps Tab.
      // 'click' = deliberate activation (mouse click, or Enter/Space on a
      // focused trigger) — gets full modal treatment where applicable.
      method: state.method,
      open,
      close,
    }),
    [state.type, state.method, open, close],
  );

  return (
    <AsideContext.Provider value={value}>{children}</AsideContext.Provider>
  );
};

export function useAside() {
  const aside = useContext(AsideContext);
  if (!aside) {
    throw new Error('useAside must be used within an AsideProvider');
  }
  return aside;
}

/** @typedef {'search' | 'cart' | 'mobile' | 'shop' | 'about' | 'closed'} AsideType */
/** @typedef {'hover' | 'click'} AsideOpenMethod */
/**
 * @typedef {{
 *   type: AsideType;
 *   method: AsideOpenMethod | null;
 *   open: (mode: AsideType, method?: AsideOpenMethod) => void;
 *   close: () => void;
 * }} AsideContextValue
 */

/** @typedef {import('react').ReactNode} ReactNode */
