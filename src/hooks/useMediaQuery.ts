import { useEffect, useState } from 'react';

function getMatches(query: string, defaultValue: boolean) {
  if (typeof window === 'undefined') {
    return defaultValue;
  }

  return window.matchMedia(query).matches;
}

export function useMediaQuery(query: string, defaultValue = false) {
  const [matches, setMatches] = useState(() => getMatches(query, defaultValue));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(query);

    const handleChange = () => {
      setMatches(mediaQuery.matches);
    };

    handleChange();
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}
