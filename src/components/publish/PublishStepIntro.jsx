import {
  LayoutGrid, ListChecks, PenLine, Camera, CalendarClock, Sparkles,
  MapPin, CheckSquare, ShieldCheck, CircleDollarSign, CreditCard, Phone,
} from 'lucide-react';
import { wizardCopy } from '@/lib/publishWizardCopy';

/**
 * PublishStepIntro — the headline every step of the slider opens with.
 *
 * It answers the only two questions a person has when a form appears one screen
 * at a time: "what am I being asked right now?" and "what happens if I do it?".
 * The rest of the step is only the fields themselves, so nothing below the
 * headline repeats it.
 *
 * The icon is here for orientation — after a tap the eye finds the step again
 * by the same mark it saw in the step before, not by re-reading the title.
 */
const ICONS = {
  category: LayoutGrid,
  category_form: ListChecks,
  description: PenLine,
  media: Camera,
  schedule: CalendarClock,
  story: Sparkles,
  location_name: MapPin,
  requirements: CheckSquare,
  verification: ShieldCheck,
  price: CircleDollarSign,
  payment_method: CreditCard,
  contactPhone: Phone,
};

export default function PublishStepIntro({ stepKey }) {
  const { title, hint } = wizardCopy(stepKey);
  if (!title) return null;

  const Icon = ICONS[stepKey] || LayoutGrid;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '2px 2px 2px' }}>
      <div style={{
        width: 38, height: 38, borderRadius: 13, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--brand-primary-light)',
        border: '1px solid var(--border-2)',
      }}>
        <Icon size={19} color="var(--brand-primary)" strokeWidth={2.2} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <h2 style={{
          margin: 0,
          fontSize: 19, fontWeight: 900, lineHeight: 1.3,
          letterSpacing: -0.4, color: 'var(--text-1)',
        }}>
          {title}
        </h2>
        {hint && (
          <p style={{
            margin: '5px 0 0',
            fontSize: 13, lineHeight: 1.55, fontWeight: 500,
            color: 'var(--text-2)',
          }}>
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}