import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { CATEGORIES } from '@/lib/categories';

const timeOptions = ['15m', '30m', '1h', '2h'];
const cities = ['תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'ראשון לציון', 'פתח תקווה', 'נתניה', 'הרצליה'];

const MAX_PRICE = 2000;

export default function FilterSheet({ open, onClose, filters, onApply }) {
  const [local, setLocal] = useState({ minPrice: '', maxPrice: '', time: '', city: '', category: '', approvalMode: '', ...filters });
  const priceRange = [Number(local.minPrice) || 0, Number(local.maxPrice) || MAX_PRICE];

  const handleApply = () => { onApply(local); onClose(); };
  const handleReset = () => {
    const reset = { minPrice: '', maxPrice: '', time: '', city: '', category: '', approvalMode: '' };
    setLocal(reset); onApply(reset); onClose();
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <SheetHeader><SheetTitle>פילטרים</SheetTitle></SheetHeader>
        <div className="space-y-5 py-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">טווח מחיר (₪)</Label>
            <Slider
              min={0} max={MAX_PRICE} step={10}
              value={priceRange}
              onValueChange={([min, max]) => setLocal(p => ({ ...p, minPrice: min === 0 ? '' : String(min), maxPrice: max === MAX_PRICE ? '' : String(max) }))}
              className="mb-3"
            />
            <div className="flex justify-between text-sm font-semibold text-gray-600">
              <span>₪{priceRange[0]}</span>
              <span>{priceRange[1] === MAX_PRICE ? 'ללא הגבלה' : `₪${priceRange[1]}`}</span>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">סוג אישור</Label>
            <div className="flex gap-2">
              {[{ val: '', label: 'הכל' }, { val: 'instant', label: '⚡ מיידי' }, { val: 'manual', label: '👥 בקשה' }].map(opt => (
                <button key={opt.val} onClick={() => setLocal(p => ({ ...p, approvalMode: opt.val }))}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                    local.approvalMode === opt.val ? 'bg-primary text-primary-foreground border-primary' : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >{opt.label}</button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium mb-2 block">זמן ביצוע</Label>
            <div className="flex gap-2 flex-wrap">
              {timeOptions.map(t => (
                <button key={t} onClick={() => setLocal(p => ({ ...p, time: p.time === t ? '' : t }))}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${local.time === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}
                >{t}</button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium mb-2 block">קטגוריה</Label>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map(c => (
                <button key={c.value} onClick={() => setLocal(p => ({ ...p, category: p.category === c.value ? '' : c.value }))}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all border ${
                    local.category === c.value ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >{c.label}</button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium mb-2 flex items-center gap-1"><MapPin className="w-4 h-4" /> סנן לפי עיר</Label>
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
          <Button onClick={handleApply} className="flex-1 rounded-xl" style={{ background: '#16a34a' }}>החל פילטרים</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}