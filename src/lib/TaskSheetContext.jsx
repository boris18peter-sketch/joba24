import { createContext, useContext, useState, useCallback } from 'react';

const TaskSheetContext = createContext(null);

export function TaskSheetProvider({ children }) {
  const [sheetTaskId, setSheetTaskId] = useState(null);

  const openTaskSheet = useCallback((taskId) => {
    if (!taskId) return;
    setSheetTaskId(taskId);
  }, []);

  const closeTaskSheet = useCallback(() => {
    setSheetTaskId(null);
  }, []);

  return (
    <TaskSheetContext.Provider value={{ sheetTaskId, openTaskSheet, closeTaskSheet }}>
      {children}
    </TaskSheetContext.Provider>
  );
}

export function useTaskSheet() {
  const ctx = useContext(TaskSheetContext);
  if (!ctx) return { sheetTaskId: null, openTaskSheet: () => {}, closeTaskSheet: () => {} };
  return ctx;
}