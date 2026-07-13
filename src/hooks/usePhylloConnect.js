import { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const PHYLLO_SCRIPT_URL = 'https://cdn.getphyllo.com/connect/v2/phyllo-connect.js';

let scriptPromise = null;

function loadPhylloScript() {
  if (window.PhylloConnect) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PHYLLO_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('טעינת ה-SDK נכשלה'));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export function usePhylloConnect() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const connect = useCallback(async ({ onAccountConnected, onAccountDisconnected, onExit }) => {
    setLoading(true);
    setError('');
    try {
      await loadPhylloScript();

      const res = await base44.functions.invoke('phylloConnect', {});
      const { user_id, token } = res.data;

      if (!token || token === 'undefined') {
        throw new Error('Token לא תקין');
      }

      const config = {
        clientDisplayName: 'Joba24',
        environment: 'staging',
        userId: user_id,
        token: token,
      };

      const phylloConnect = window.PhylloConnect.initialize(config);

      phylloConnect.on('accountConnected', (accountId, workplatformId, userId) => {
        onAccountConnected?.(accountId, workplatformId, userId);
      });

      phylloConnect.on('accountDisconnected', (accountId, workplatformId, userId) => {
        onAccountDisconnected?.(accountId, workplatformId, userId);
      });

      phylloConnect.on('exit', (reason, userId) => {
        onExit?.(reason, userId);
      });

      phylloConnect.on('tokenExpired', () => {
        setError('פג תוקף הטוקן, נסה שוב');
      });

      phylloConnect.on('connectionFailure', (reason) => {
        setError('החיבור נכשל: ' + reason);
      });

      phylloConnect.open();
    } catch (e) {
      setError(e?.message || 'שגיאה בחיבור');
    } finally {
      setLoading(false);
    }
  }, []);

  return { connect, loading, error, setError };
}