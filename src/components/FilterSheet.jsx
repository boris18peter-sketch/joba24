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
  const [local, setLocal] = useState({ minPrice: '', maxPrice: '', time: '', city: '', approvalMode: '', ...filters });

  const activePriceOption = PRICE_OPTIONS.find(o => o.min === (local.minPrice || '') && o.max === (local.maxPrice || '')) || null;

  const handleApply = () => { onApply(local); onClose(); };
  const handleReset = () => {
    const reset = { minPrice: '', maxPrice: '', time: '', city: '', approvalMode: '' };
    setLocal(reset); onApply(reset); onClose();
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <SheetHeader><SheetTitle>פילטרים</SheetTitle></SheetHeader>
        <div className="space-y-5 py-4">

          {/* Price */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">מחיר</Label>
            <div className="flex gap-2 flex-wrap">
              {PRICE_OPTIONS.map(opt => {
                const isActive = activePriceOption?.label === opt.label;
                return (
                  <button key={opt.label}
                    onClick={() => setLocal(p => ({ ...p, minPrice: opt.min, maxPrice: opt.max }))}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all border ${
                      isActive ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >{opt.label}</button>
                );
              })}
            </div>
          </div>

          {/* Approval mode */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">סוג ביצוע</Label>
            <div className="flex gap-2">
              {[{ val: '', label: 'הכל' }, { val: 'instant', label: '⚡ מיידי' }, { val: 'manual', label: '✋ ממתין לאישור' }].map(opt => (
                <button key={opt.val} onClick={() => setLocal(p => ({ ...p, approvalMode: opt.val }))}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all border ${
                    local.approvalMode === opt.val ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >{opt.label}</button>
              ))}
            </div>
          </div>

          {/* Time */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">זמן ביצוע</Label>
            <div className="flex gap-2 flex-wrap">
              {timeOptions.map(t => (
                <button key={t} onClick={() => setLocal(p => ({ ...p, time: p.time === t ? '' : t }))}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all border ${
                    local.time === t ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >{t}</button>
              ))}
            </div>
          </div>

          {/* City */}
          <div>
            <Label className="text-sm font-semibold mb-2 flex items-center gap-1"><MapPin className="w-4 h-4" /> עיר</Label>
            <div className="flex gap-2 flex-wrap">
              {cities.map(c => (
                <button key={c} onClick={() => setLocal(p => ({ ...p, city: p.city === c ? '' : c }))}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all border ${
                    local.city === c ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >{c}</button>
              ))}
            </div>
            <Input placeholder="עיר אחרת..." className="bg-secondary border-0 rounded-xl mt-2 text-sm"
              value={!cities.includes(local.city) ? local.city : ''}
              onChange={e => setLocal(p => ({ ...p, city: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex gap-2 pb-4">
          <Button variant="outline" onClick={handleReset} className="flex-1 rounded-xl">איפוס</Button>
          <Button onClick={handleApply} className="flex-1 rounded-xl bg-black hover:bg-gray-900">החל</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}