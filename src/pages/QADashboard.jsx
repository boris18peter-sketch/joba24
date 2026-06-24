import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Send, ShieldCheck, AlertTriangle, CheckCircle, XCircle, RefreshCw, Bot, ChevronLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function QADashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [qaReport, setQaReport] = useState(null);
  const [qaLoading, setQaLoading] = useState(false);
  const [agentThinking, setAgentThinking] = useState(false);
  const scrollRef = useRef(null);

  // Create or load conversation
  useEffect(() => {
    let convId = sessionStorage.getItem('qa_conv_id');
    if (!convId) {
      const conv = base44.agents.createConversation({
        agent_name: 'qa_agent',
        metadata: { name: 'QA Session', description: 'QA testing session' },
      });
      convId = conv.id;
      sessionStorage.setItem('qa_conv_id', convId);
      setConversation(conv);
      setMessages(conv.messages || []);
    } else {
      const conv = base44.agents.getConversation(convId);
      setConversation(conv);
      setMessages(conv.messages || []);
    }
  }, []);

  // Subscribe to conversation updates
  useEffect(() => {
    if (!conversation?.id) return;
    const unsub = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
      const lastMsg = data.messages?.[data.messages.length - 1];
      if (lastMsg?.role === 'assistant' && !lastMsg.tool_calls?.some(tc => tc.status === 'pending' || tc.status === 'running' || tc.status === 'in_progress')) {
        setAgentThinking(false);
      }
    });
    return unsub;
  }, [conversation?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text) => {
    const content = text || input;
    if (!content.trim() || !conversation || sending) return;
    setSending(true);
    setAgentThinking(true);
    setInput('');
    try {
      await base44.agents.addMessage(conversation, { role: 'user', content });
    } catch (err) {
      console.error('Send error:', err);
      setAgentThinking(false);
    }
    setSending(false);
  };

  const handleRunQAChecks = async () => {
    setQaLoading(true);
    try {
      const res = await base44.functions.invoke('runQAChecks', {});
      setQaReport(res.data);
      // Also send the report to the agent for analysis
      const report = res.data;
      if (report) {
        await handleSend(`הרצתי בדיקות QA אוטומטיות. הנה התוצאות:\n\nסה"כ בעיות: ${report.summary?.total_issues || 0} (גבוהות: ${report.summary?.high || 0}, בינוניות: ${report.summary?.medium || 0}, נמוכות: ${report.summary?.low || 0})\nבדיקות שעברו: ${report.summary?.checks_passed}/${report.summary?.checks_total}\n\nאנא נתח את הבעיות שנמצאו והצע פתרונות.`);
      }
    } catch (err) {
      console.error('QA check error:', err);
    }
    setQaLoading(false);
  };

  const quickActions = [
    { label: '🔍 בדוק הכל', text: 'אנא בצע בדיקת QA מקיפה על כל הישויות במערכת — משימות, בקשות, ביקורות, ויתרות קרדיטים. דווח על כל בעיה שאתה מוצא.' },
    { label: '🧪 סימולציית תהליך מלא', text: 'הרץ סימולציית full_flow על משימת בדיקה פתוחה ודווח אם כל השלבים עברו בהצלחה.' },
    { label: '📊 סטטוס מערכת', text: 'תן לי סיכום מהיר של מצב המערכת — כמה משימות פתוחות, כמה פעילות, כמה הושלמו, והאם יש משהו חריג.' },
  ];

  return (
    <div dir="rtl" style={{ position: 'fixed', inset: 0, background: 'var(--surface-1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ── Header ── */}
      <div style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-1)', padding: 'max(12px, env(safe-area-inset-top)) 16px 12px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={18} color="var(--text-2)" />
        </button>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Bot size={20} color="white" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-1)' }}>QA Agent 🤖</div>
          <div style={{ fontSize: 11, color: agentThinking ? '#1a6fd4' : 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
            {agentThinking ? <><Loader2 size={10} className="animate-spin" /> בודק...</> : 'מוכן לבדיקות'}
          </div>
        </div>
        <button
          onClick={handleRunQAChecks}
          disabled={qaLoading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 12, background: qaLoading ? 'var(--surface-3)' : 'linear-gradient(135deg,#1a6fd4,#0a52b0)', color: qaLoading ? 'var(--text-3)' : 'white', border: 'none', fontWeight: 700, fontSize: 13, cursor: qaLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
        >
          {qaLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          סריקה מהירה
        </button>
      </div>

      {/* ── QA Report Summary (if available) ── */}
      {qaReport && (
        <div style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-1)', padding: '12px 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            {qaReport.status === 'healthy' ? (
              <CheckCircle size={18} color="#16a34a" />
            ) : (
              <AlertTriangle size={18} color="#f59e0b" />
            )}
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>סריקה אוטומטית — {qaReport.status === 'healthy' ? 'תקין ✅' : 'נמצאו בעיות ⚠️'}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <ReportChip label={`עברו: ${qaReport.summary?.checks_passed}/${qaReport.summary?.checks_total}`} color="#16a34a" bg="#f0fdf4" border="#86efac" icon={<CheckCircle size={11} />} />
            {qaReport.summary?.high > 0 && <ReportChip label={`גבוהות: ${qaReport.summary.high}`} color="#dc2626" bg="#fff1f2" border="#fecaca" icon={<XCircle size={11} />} />}
            {qaReport.summary?.medium > 0 && <ReportChip label={`בינוניות: ${qaReport.summary.medium}`} color="#d97706" bg="#fffbeb" border="#fde68a" icon={<AlertTriangle size={11} />} />}
            {qaReport.summary?.low > 0 && <ReportChip label={`נמוכות: ${qaReport.summary.low}`} color="#64748b" bg="#f1f5f9" border="#e2e8f0" icon={<AlertTriangle size={11} />} />}
          </div>
          {qaReport.stats && (
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>
              נסרקו: {qaReport.stats.tasks} משימות · {qaReport.stats.applications} בקשות · {qaReport.stats.reviews} ביקורות · {qaReport.stats.users} משתמשים
            </div>
          )}
        </div>
      )}

      {/* ── Messages ── */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 14, WebkitOverflowScrolling: 'touch' }}>
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 16, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={30} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)', marginBottom: 4 }}>QA Agent</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 280 }}>
                סוכן חכם שבודק את המערכת — יושלמות נתונים, עקביות סטטוסים, וסימולציית תהליכים.
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 320 }}>
              {quickActions.map((qa, i) => (
                <button key={i} onClick={() => handleSend(qa.text)} style={{ padding: '12px 16px', borderRadius: 14, background: 'var(--surface-2)', border: '1px solid var(--border-1)', color: 'var(--text-1)', fontSize: 14, fontWeight: 700, cursor: 'pointer', textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {qa.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <div key={idx} style={{ display: 'flex', justifyContent: isUser ? 'flex-start' : 'flex-end' }}>
              <div style={{
                maxWidth: '85%',
                padding: '10px 14px',
                borderRadius: isUser ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
                background: isUser ? 'var(--surface-2)' : 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
                color: isUser ? 'var(--text-1)' : 'white',
                border: isUser ? '1px solid var(--border-1)' : 'none',
                fontSize: 14,
                lineHeight: 1.6,
              }}>
                {msg.tool_calls?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: msg.content ? 6 : 0 }}>
                    {msg.tool_calls.map((tc, i) => {
                      const isFailed = tc.status === 'failed' || tc.status === 'error';
                      const isRunning = ['pending', 'running', 'in_progress'].includes(tc.status);
                      return (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 8,
                          background: isUser ? 'var(--surface-3)' : 'rgba(255,255,255,0.15)',
                          color: isUser ? 'var(--text-2)' : 'rgba(255,255,255,0.9)',
                        }}>
                          {isRunning ? <Loader2 size={10} className="animate-spin" /> : isFailed ? <XCircle size={10} /> : <CheckCircle size={10} />}
                          {tc.name || 'פעולה'}
                        </div>
                      );
                    })}
                  </div>
                )}
                {msg.content && (
                  isUser
                    ? <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                    : <ReactMarkdown style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{msg.content}</ReactMarkdown>
                )}
              </div>
            </div>
          );
        })}

        {agentThinking && messages.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ padding: '10px 16px', borderRadius: '16px 16px 4px 16px', background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Loader2 size={14} className="animate-spin" color="white" />
              <span style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>בודק...</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Input ── */}
      <div style={{ flexShrink: 0, padding: '12px 16px max(12px, env(safe-area-inset-bottom))', background: 'var(--surface-2)', borderTop: '1px solid var(--border-1)' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="שאל את ה-QA Agent..."
            rows={1}
            style={{ flex: 1, padding: '12px 14px', borderRadius: 14, border: '1.5px solid var(--border-1)', background: 'var(--input-bg)', color: 'var(--text-1)', fontSize: 15, outline: 'none', resize: 'none', maxHeight: 120, fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || sending}
            style={{ width: 48, height: 48, borderRadius: 14, background: input.trim() ? 'linear-gradient(135deg,#1a6fd4,#0a52b0)' : 'var(--surface-3)', border: 'none', cursor: input.trim() && !sending ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            {sending ? <Loader2 size={18} className="animate-spin" color="white" /> : <Send size={18} color={input.trim() ? 'white' : 'var(--text-3)'} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportChip({ label, color, bg, border, icon }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 99, background: bg, color, border: `1px solid ${border}`, fontSize: 11, fontWeight: 700 }}>
      {icon}{label}
    </span>
  );
}