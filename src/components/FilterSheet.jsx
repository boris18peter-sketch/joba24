import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin } from 'lucide-react';
import { CATEGORIES } from '@/lib/categories';

const timeOptions = ['15m', '30m', '1h', '2h'];
const cities = ['תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'ראשון לציון', 'פתח תקווה', 'נתניה', 'הרצליה'];

export default function FilterSheet({ open, onClose, filters, onApply }) {
  const [local, setLocal] = useState(filters);

  const handleApply = () => { onApply(local); onClose(); };
  const handleReset = () => {
    const reset = { maxPrice: '', time: '', city: '', category: '' };
    setLocal(reset); onApply(reset); onClose();
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-2xl" dir="rtl">
        <SheetHeader><SheetTitle>פילטרים</SheetTitle></SheetHeader>
        <div className="space-y-5 py-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">מחיר מקסימלי (₪)</Label>
            <Input type="number" placeholder="ללא הגבלה"
              value={local.maxPrice} onChange={e => setLocal(p => ({ ...p, maxPrice: e.target.value }))}
              className="bg-secondary border-0 rounded-xl"
            />
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