import {useState, useRef, useCallback} from 'react';

/**
 * Custom hook for managing cascading transitions between filter options
 * @param {string[]} options - Array of option values
 * @param {function} isChecked - External function to check if a value is selected
 * @returns {Object} - { transitioning, handleSelection }
 */
export function useCascadingFilterSelection(options, isChecked) {
  const [transitioning, setTransitioning] = useState(new Set());
  const transitionTimeoutRef = useRef(null);
  const previousSelectedRef = useRef(null);

  const handleSelection = useCallback(
    (newValue, onSelect) => {
      // Find current selected value
      const currentSelected = options.find((opt) => isChecked(opt));

      if (newValue === currentSelected) return;

      const currentIndex = currentSelected
        ? options.indexOf(currentSelected)
        : -1;
      const newIndex = options.indexOf(newValue);

      // Clear any existing timeout
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }

      // Calculate the indices between current and new position
      if (currentIndex !== -1 && newIndex !== -1) {
        const start = Math.min(currentIndex, newIndex);
        const end = Math.max(currentIndex, newIndex);
        const inBetween = options.slice(start + 1, end);
        if (currentIndex > newIndex) inBetween.reverse();

        // Cascade through each element
        const cascadeDelay = 200 / (inBetween.length + 1);

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
      }

      // Execute the selection callback
      onSelect(newValue);
      previousSelectedRef.current = newValue;
    },
    [options, isChecked],
  );

  return {
    transitioning,
    handleSelection,
  };
}
