import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin } from 'lucide-react';

const timeOptions = ['15m', '30m', '1h', '2h'];
const cities = ['תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'ראשון לציון', 'פתח תקווה', 'נתניה', 'הרצליה'];

const PRICE_OPTIONS = [
  { label: 'הכל', min: '', max: '' },
  { label: 'עד ₪100', min: '', max: '100' },
  { label: '₪100–300', min: '100', max: '300' },
  { label: '₪300–600', min: '300', max: '600' },
  { label: '₪600+', min: '600', max: '' },
];

export default function FilterSheet({ open, onClose, filters, onApply }) {
  const [local, setLocal] = useState({ minPrice: '', maxPrice: '', time: '', city: '', approvalMode: '', sortBy: '', ...filters });

  const activePriceOption = PRICE_OPTIONS.find(o => o.min === (local.minPrice || '') && o.max === (local.maxPrice || '')) || null;

  const handleApply = () => { onApply(local); onClose(); };
  const handleReset = () => {
    const reset = { minPrice: '', maxPrice: '', time: '', city: '', approvalMode: '', sortBy: '', category: '' };
    setLocal(reset); onApply(reset); onClose();
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-2xl" style={{ maxHeight: '80vh', overflow: 'hidden', paddingBottom: 'max(16px, env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', zIndex: 10000 }} dir="rtl">
        <SheetHeader style={{ flexShrink: 0, marginBottom: 16 }}>
          <SheetTitle style={{ color: '#0f2b6b', fontWeight: 800 }}>פילטרים</SheetTitle>
        </SheetHeader>
        
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingRight: 0, overflow: 'hidden' }}>

          {/* Price */}
          <div style={{ paddingRight: 16 }}>
            <Label style={{ color: '#0f2b6b', fontWeight: 700, fontSize: 13, marginBottom: 8, display: 'block' }}>מחיר</Label>
            <div className="flex gap-2 flex-wrap">
              {PRICE_OPTIONS.map(opt => {
                const isActive = activePriceOption?.label === opt.label;
                return (
                  <button key={opt.label}
                    onClick={() => setLocal(p => ({ ...p, minPrice: opt.min, maxPrice: opt.max }))}
                    style={{
                      padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                      background: isActive ? '#1a6fd4' : 'white',
                      color: isActive ? 'white' : '#555',
                      border: isActive ? '1px solid #1a6fd4' : '1px solid #dce8f5',
                    }}
                  >{opt.label}</button>
                );
              })}
            </div>
          </div>

          {/* Time */}
          <div style={{ paddingRight: 16 }}>
            <Label style={{ color: '#0f2b6b', fontWeight: 700, fontSize: 13, marginBottom: 8, display: 'block' }}>זמן ביצוע</Label>
            <div className="flex gap-2 flex-wrap">
              {timeOptions.map(t => (
                <button key={t} onClick={() => setLocal(p => ({ ...p, time: p.time === t ? '' : t }))}
                  style={{
                    padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    background: local.time === t ? '#1a6fd4' : 'white',
                    color: local.time === t ? 'white' : '#555',
                    border: local.time === t ? '1px solid #1a6fd4' : '1px solid #dce8f5',
                  }}
                >{t}</button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div style={{ paddingRight: 16 }}>
            <Label style={{ color: '#0f2b6b', fontWeight: 700, fontSize: 13, marginBottom: 8, display: 'block' }}>מיון</Label>
            <div className="flex gap-2 flex-wrap">
              {[{ val: '', label: 'רלוונטי' }, { val: 'newest', label: '🆕 חדשות קודם' }, { val: 'price_desc', label: '💰 מחיר גבוה' }, { val: 'price_asc', label: '💸 מחיר נמוך' }].map(opt => (
                <button key={opt.val} onClick={() => setLocal(p => ({ ...p, sortBy: opt.val }))}
                  style={{
                    padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    background: local.sortBy === opt.val ? '#1a6fd4' : 'white',
                    color: local.sortBy === opt.val ? 'white' : '#555',
                    border: local.sortBy === opt.val ? '1px solid #1a6fd4' : '1px solid #dce8f5',
                  }}
                >{opt.label}</button>
              ))}
            </div>
          </div>

          {/* City */}
          <div style={{ paddingRight: 16 }}>
            <Label style={{ color: '#0f2b6b', fontWeight: 700, fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={14} /> עיר
            </Label>
            <div className="flex gap-2 flex-wrap">
              {cities.map(c => (
                <button key={c} onClick={() => setLocal(p => ({ ...p, city: p.city === c ? '' : c }))}
                  style={{
                    padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    background: local.city === c ? '#1a6fd4' : 'white',
                    color: local.city === c ? 'white' : '#555',
                    border: local.city === c ? '1px solid #1a6fd4' : '1px solid #dce8f5',
                  }}
                >{c}</button>
              ))}
            </div>
            <Input placeholder="עיר אחרת..."
              style={{ background: '#f4f7fb', border: '1px solid #dce8f5', borderRadius: 12, marginTop: 8, fontSize: 16 }}
              value={!cities.includes(local.city) ? local.city : ''}
              onChange={e => setLocal(p => ({ ...p, city: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex gap-2" style={{ flexShrink: 0, paddingRight: 16, paddingTop: 16, borderTop: '1px solid #f0f4fb' }}>
          <button onClick={handleReset}
            style={{ flex: 1, height: 48, borderRadius: 14, background: 'white', border: '1px solid #dce8f5', color: '#0f2b6b', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >איפוס</button>
          <button onClick={handleApply}
            style={{ flex: 1, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)', color: 'white', fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer' }}
          >החל</button>
        </div>
      </SheetContent>
    </Sheet>
  );
}