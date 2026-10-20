import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const TaskSheetContext = createContext(null);

export function TaskSheetProvider({ children }) {
  const queryClient = useQueryClient();
  const [sheetTaskId, setSheetTaskId] = useState(null);
  const [hiddenTaskId, setHiddenTaskId] = useState(null);
  // Ref mirror of sheetTaskId so hideTaskSheet can read it synchronously
  // without nesting a setter inside another setter's updater.
  const sheetTaskIdRef = useRef(null);
  // Flag — set when closeTaskSheet is called so the popstate handler doesn't
  // re-open the sheet (which it would if the previous history entry also has
  // a { taskSheet } state).
  const closingRef = useRef(false);

  // Opens the sheet and pushes a history entry (without URL change) so the
  // hardware back button / swipe-back closes the sheet.
  // Uses pushState (not navigate) to avoid React Router page transition animations.
  const openTaskSheet = useCallback((taskId, seed) => {
    if (!taskId) return;
    // ── PAINT FROM WHAT THE CARD ALREADY HOLDS ────────────────────────────────
    // The card that was just tapped is holding the task's own record in memory.
    // Seeding the sheet's query with it lets the sheet render real content on its
    // FIRST frame instead of a spinner, while the server is asked for the
    // complete record at the same moment and quietly replaces it.
    //
    // Only when nothing is cached for this task: on a re-open the sheet already
    // has the record, so seeding would be wasted work and the refresh below would
    // be a request the app was not making before. This therefore adds ZERO
    // network calls — the one it triggers is the one the sheet would have made
    // anyway, simply started a moment earlier and no longer blocking the paint.
    if (seed && seed.id === taskId && !queryClient.getQueryData(['task', taskId])) {
      queryClient.setQueryData(['task', taskId], seed);
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    }
    sheetTaskIdRef.current = taskId;
    setSheetTaskId(taskId);
    setHiddenTaskId(null);
    if (window.history.state?.taskSheet) {
      // Sheet already has a history entry — replace it with the new taskId
      // so Back restores the correct task, not a stale one
      window.history.replaceState({ taskSheet: taskId }, '');
    } else {
      window.history.pushState({ taskSheet: taskId }, '');
    }
  }, []);

  // Closes the sheet. If we pushed a history entry, go back to pop it
  // (the popstate listener will clear sheetTaskId).
  const closeTaskSheet = useCallback(() => {
    closingRef.current = true;
    setHiddenTaskId(null);
    sheetTaskIdRef.current = null;
    setSheetTaskId(null);
    if (window.history.state?.taskSheet) {
      window.history.back();
    }
  }, []);

  // Hides the sheet WITHOUT touching history — used when the user navigates
  // away (e.g., clicks a profile link inside the sheet). The {taskSheet}
  // history entry stays in the stack so pressing Back restores the sheet.
  // Stores the hidden task ID so a popup can offer to return.
  const hideTaskSheet = useCallback(() => {
    if (sheetTaskIdRef.current) {
      setHiddenTaskId(sheetTaskIdRef.current);
    }
    sheetTaskIdRef.current = null;
    setSheetTaskId(null);
  }, []);

  // Clears the hidden task ID (dismisses the return popup)
  const clearHiddenTask = useCallback(() => {
    setHiddenTaskId(null);
  }, []);

  // Dismisses the sheet WITHOUT offering to return to it.
  //
  // Used when something else takes over the whole screen (the Boost overlay):
  // the sheet must simply go away. hideTaskSheet would leave `hiddenTaskId` set
  // — which raises the "return to task" bar the moment the overlay closes — and
  // would leave the {taskSheet} history marker behind, so Back could restore a
  // sheet the user never asked for. Both are cleared here.
  const dismissTaskSheet = useCallback(() => {
    sheetTaskIdRef.current = null;
    setSheetTaskId(null);
    setHiddenTaskId(null);
    if (window.history.state?.taskSheet) {
      window.history.replaceState({ ...window.history.state, taskSheet: null }, '');
    }
  }, []);

  // Listen for popstate (hardware back button, swipe-back) to close or restore the sheet
  useEffect(() => {
    const handlePopState = () => {
      if (closingRef.current) {
        // This popstate was triggered by closeTaskSheet — don't re-open
        closingRef.current = false;
        return;
      }
      if (window.history.state?.taskSheet) {
        // We're back at the task sheet entry — restore it
        sheetTaskIdRef.current = window.history.state.taskSheet;
        setSheetTaskId(window.history.state.taskSheet);
        setHiddenTaskId(null);
      } else {
        sheetTaskIdRef.current = null;
        setSheetTaskId(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <TaskSheetContext.Provider value={{ sheetTaskId, hiddenTaskId, openTaskSheet, closeTaskSheet, hideTaskSheet, dismissTaskSheet, clearHiddenTask }}>
      {children}
    </TaskSheetContext.Provider>
  );
}

export function useTaskSheet() {
  const ctx = useContext(TaskSheetContext);
  if (!ctx) return { sheetTaskId: null, hiddenTaskId: null, openTaskSheet: () => {}, closeTaskSheet: () => {}, hideTaskSheet: () => {}, dismissTaskSheet: () => {}, clearHiddenTask: () => {} };
  return ctx;
}