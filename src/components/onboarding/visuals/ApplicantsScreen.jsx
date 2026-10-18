import { Star, CheckCircle2, MessageCircle, X, ShieldCheck, Briefcase, Zap } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * The applicants panel from the publisher's task screen, mirroring
 * `TaskApplicants` card for card: the same avatar, the same name + rating +
 * verification row, the same message bubble and the same decision bar —
 * "דחה" next to "אשר עובד", which is exactly the choice this screen teaches.
 *
 * One applicant is deliberately marked as the attractive choice: a gold
 * "מומלץ" corner, an "זמין עכשיו" pill and a note saying they can come
 * immediately. That is the point of the screen — applicants reach the publisher
 * within minutes, and some of them are ready to set off right now.
 *
 * Photos are real portraits rather than initials, so the list reads as people
 * rather than as rows.
 */
const APPLICANTS = [
  {
    id: 'a1',
    nameKey: 'onb_a1_name',
    photo: 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/164b1dd7e_generated_image.png',
    rating: 4.9,
    tasks: 34,
    verified: true,
    messageKey: 'onb_a1_msg',
  },
  {
    id: 'a2',
    nameKey: 'onb_a2_name',
    photo: 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/4f12cd8d8_generated_image.png',
    rating: 4.8,
    tasks: 21,
    verified: true,
    messageKey: 'onb_a2_msg',
    highlight: true,
    available: true,
  },
  {
    id: 'a3',
    nameKey: 'onb_a3_name',
    photo: 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/302897af9_generated_image.png',
    rating: 5.0,
    tasks: 47,
    verified: true,
    messageKey: 'onb_a3_msg',
  },
  {
    id: 'a4',
    nameKey: 'onb_a4_name',
    photo: 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/bb3cd8ce0_generated_image.png',
    rating: 4.6,
    tasks: 9,
    verified: false,
    messageKey: null,
  },
];

function ApplicantCard({ app }) {
  const { t } = useLanguage();
  const hl = !!app.highlight;

  return (
    <div style={{
      position: 'relative',
      background: 'var(--surface-2)',
      border: hl ? '2px solid var(--brand-accent)' : '1px solid var(--border-1)',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: hl ? '0 6px 22px rgba(217,119,6,0.22)' : 'var(--shadow-xs)',
    }}>
      {/* The attractive choice — one glance says "this is the one to pick" */}
      {hl && (
        <div style={{
          position: 'absolute', top: 0, left: 0,
          display: 'flex', alignItems: 'center', gap: 3,
          padding: '4px 10px',
          background: 'linear-gradient(135deg, var(--brand-accent), var(--brand-accent-dark))',
          color: '#1a3a6b', fontSize: 10.5, fontWeight: 900,
          borderRadius: '0 0 12px 0',
          boxShadow: '0 2px 8px rgba(217,119,6,0.35)',
        }}>
          <Star size={10} style={{ fill: '#1a3a6b', color: '#1a3a6b' }} /> {t('onb_v_recommended')}
        </div>
      )}

      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 11 }}>
        <img
          src={app.photo}
          alt=""
          style={{
            width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
            border: hl ? '2px solid var(--brand-accent)' : '2px solid var(--border-1)',
          }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>{t(app.nameKey)}</span>
            {app.available && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: 9.5, fontWeight: 800,
                background: 'var(--color-success-bg)', color: 'var(--color-success)',
                border: '1px solid var(--color-success-border)',
                borderRadius: 999, padding: '1px 7px',
              }}>
                <Zap size={9} /> {t('onb_v_available_now')}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: 'var(--color-warning)' }}>
              <Star size={11} style={{ fill: 'var(--brand-accent)', color: 'var(--brand-accent)' }} />
              {app.rating.toFixed(1)}
            </span>
            {app.verified && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 800, color: 'var(--color-success)' }}>
                <ShieldCheck size={11} /> {t('onb_v_verified')}
              </span>
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600, color: 'var(--text-3)' }}>
              <Briefcase size={10} /> {t('onb_v_tasks_n', { n: app.tasks })}
            </span>
          </div>
        </div>

        <div style={{
          width: 34, height: 34, borderRadius: 11, flexShrink: 0,
          background: 'var(--brand-primary-light)', border: '1px solid var(--border-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <MessageCircle size={15} color="var(--brand-primary)" />
        </div>
      </div>

      {app.messageKey && (
        <div style={{ padding: '0 14px 10px' }}>
          <div style={{
            background: hl ? 'var(--color-success-bg)' : 'var(--surface-3)',
            border: hl ? '1px solid var(--color-success-border)' : '1px solid transparent',
            borderRadius: 10, padding: '8px 12px',
            fontSize: 12, lineHeight: 1.5,
            fontWeight: hl ? 800 : 500,
            color: hl ? 'var(--color-success)' : 'var(--text-2)',
          }}>
            {t(app.messageKey)}
          </div>
        </div>
      )}

      {/* The decision: decline, or approve the person who will do the job */}
      <div style={{ borderTop: '1px solid var(--border-1)', padding: '8px 14px', display: 'flex', gap: 8 }}>
        <div style={{
          flex: 1, height: 40, borderRadius: 11,
          background: 'var(--surface-3)', border: '1px solid var(--border-1)',
          color: 'var(--text-2)', fontWeight: 700, fontSize: 13,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <X size={15} /> {t('onb_v_decline')}
        </div>
        <div style={{
          flex: 1.5, height: 40, borderRadius: 11,
          background: 'linear-gradient(135deg, #059669, #047857)',
          color: '#ffffff', fontWeight: 800, fontSize: 13,
          boxShadow: hl ? '0 3px 14px rgba(5,150,105,0.45)' : '0 2px 10px rgba(5,150,105,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <CheckCircle2 size={15} /> {t('onb_v_approve')}
        </div>
      </div>
    </div>
  );
}

export default function ApplicantsScreen() {
  const { t } = useLanguage();

  return (
    <>
      <div style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 14px', background: 'var(--surface-2)', boxShadow: '0 1px 0 var(--border-1)' }}>
        <span style={{ fontSize: 16.5, fontWeight: 900, color: 'var(--text-1)' }}>{t('onb_v_applicants')}</span>
      </div>

      <div style={{ background: 'var(--surface-1)', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', letterSpacing: 0.3 }}>
          {t('onb_v_applicants_n', { n: APPLICANTS.length })}
        </div>

        {APPLICANTS.map(app => <ApplicantCard key={app.id} app={app} />)}
      </div>
    </>
  );
}