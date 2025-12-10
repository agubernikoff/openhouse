import {useState, useRef, useCallback} from 'react';

/**
 * Custom hook for managing cascading transitions between filter options
 * @param {string[]} options - Array of option values
 * @param {string} initialValue - Initial selected value
 * @returns {Object} - { selected, transitioning, handleSelection }
 */
export function useCascadingSelection(options, initialValue) {
  const [selected, setSelected] = useState(initialValue);
  const [transitioning, setTransitioning] = useState(new Set());
  const transitionTimeoutRef = useRef(null);

  const handleSelection = useCallback(
    (newValue) => {
      if (newValue === selected) return;

      const currentIndex = options.indexOf(selected);
      const newIndex = options.indexOf(newValue);

      // Clear any existing timeout
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }

      // Calculate the indices between current and new position
      const start = Math.min(currentIndex, newIndex);
      const end = Math.max(currentIndex, newIndex);
      const inBetween = options.slice(start + 1, end);
      if (currentIndex > newIndex) inBetween.reverse();

      // Cascade through each element
      const cascadeDelay = 200 / (inBetween.length + 1); // milliseconds between each cascade

      inBetween.forEach((option, idx) => {
        setTimeout(() => {
          setTransitioning((prev) => new Set([...prev, option]));
        }, idx * cascadeDelay);

        setTimeout(
          () => {
            setTransitioning((prev) => {
              const next = new Set(prev);
              next.delete(option);
              return next;
            });
          },
          (idx + 1) * cascadeDelay + 150,
        );
      });

      // Set the final selection after cascade completes
      setSelected(newValue);
    },
    [selected, options],
  );

  const isChecked = useCallback(
    (value) => {
      return selected === value;
    },
    [selected],
  );

  return {
    selected,
    transitioning,
    handleSelection,
    isChecked,
  };
}
