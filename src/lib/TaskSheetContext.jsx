import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const TaskSheetContext = createContext(null);

export function TaskSheetProvider({ children }) {
  const [sheetTaskId, setSheetTaskId] = useState(null);

  // Opens the sheet and pushes a history entry (without URL change) so the
  // hardware back button / swipe-back closes the sheet.
  // Uses pushState (not navigate) to avoid React Router page transition animations.
  const openTaskSheet = useCallback((taskId) => {
    if (!taskId) return;
    setSheetTaskId(taskId);
    if (!window.history.state?.taskSheet) {
      window.history.pushState({ taskSheet: taskId }, '');
    }
  }, []);

  // Closes the sheet. If we pushed a history entry, go back to pop it
  // (the popstate listener will clear sheetTaskId).
  const closeTaskSheet = useCallback(() => {
    if (window.history.state?.taskSheet) {
      window.history.back();
    } else {
      setSheetTaskId(null);
    }
  }, []);

  // Listen for popstate (hardware back button, swipe-back) to close the sheet
  useEffect(() => {
    const handlePopState = () => {
      if (!window.history.state?.taskSheet) {
        setSheetTaskId(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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