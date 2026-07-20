import { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const TaskSheetContext = createContext(null);

export function TaskSheetProvider({ children }) {
  const [sheetTaskId, setSheetTaskId] = useState(null);
  const navigate = useNavigate();

  // Opens the sheet AND navigates to /task/:id so hardware back / swipe-back closes it
  const openTaskSheet = useCallback((taskId) => {
    if (!taskId) return;
    setSheetTaskId(taskId);
    navigate(`/task/${taskId}`);
  }, [navigate]);

  // Closes the sheet. If we're on /task/:id, navigate back so the URL stays in sync.
  // The Layout useEffect will clear sheetTaskId when the URL changes away.
  const closeTaskSheet = useCallback(() => {
    if (window.location.pathname.startsWith('/task/')) {
      navigate(-1);
    } else {
      setSheetTaskId(null);
    }
  }, [navigate]);

  // Sync sheet state without navigating — used by Layout's URL watcher
  const syncSheetTaskId = useCallback((taskId) => {
    setSheetTaskId(taskId);
  }, []);

  return (
    <TaskSheetContext.Provider value={{ sheetTaskId, openTaskSheet, closeTaskSheet, syncSheetTaskId }}>
      {children}
    </TaskSheetContext.Provider>
  );
}

export function useTaskSheet() {
  const ctx = useContext(TaskSheetContext);
  if (!ctx) return { sheetTaskId: null, openTaskSheet: () => {}, closeTaskSheet: () => {}, syncSheetTaskId: () => {} };
  return ctx;
}