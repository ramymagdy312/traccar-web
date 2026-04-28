import { useCallback, useState } from 'react';

export const compareValues = (a, b) => {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  return String(a).localeCompare(String(b));
};

export const sortItems = (list, key, direction, getValue) => {
  if (!key || !direction) return list;
  const dir = direction === 'desc' ? -1 : 1;
  return [...list].sort((a, b) => compareValues(getValue(a, key), getValue(b, key)) * dir);
};

const useReportSort = () => {
  const [sortConfig, setSortConfig] = useState(null);
  const handleSort = useCallback((key) => {
    setSortConfig((prev) => {
      if (!prev || prev.key !== key) {
        return { key, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null;
    });
  }, []);
  return { sortConfig, setSortConfig, handleSort };
};

export default useReportSort;
