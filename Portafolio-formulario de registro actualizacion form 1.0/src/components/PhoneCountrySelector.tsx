import { useState, useRef, useEffect } from 'react';

export const ALL_COUNTRIES = [
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', prefix: '+57', maxLength: 10 },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', prefix: '+1', maxLength: 10 },
  { code: 'MX', name: 'México', flag: '🇲🇽', prefix: '+52', maxLength: 10 },
  { code: 'ES', name: 'España', flag: '🇪🇸', prefix: '+34', maxLength: 9 },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', prefix: '+54', maxLength: 10 },
  { code: 'PE', name: 'Perú', flag: '🇵🇪', prefix: '+51', maxLength: 9 },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪', prefix: '+58', maxLength: 10 },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', prefix: '+56', maxLength: 9 },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', prefix: '+593', maxLength: 9 },
  { code: 'PA', name: 'Panamá', flag: '🇵🇦', prefix: '+507', maxLength: 8 },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', prefix: '+506', maxLength: 8 },
  { code: 'DO', name: 'Rep. Dominicana', flag: '🇩🇴', prefix: '+1', maxLength: 10 },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', prefix: '+598', maxLength: 8 },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾', prefix: '+595', maxLength: 9 },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴', prefix: '+591', maxLength: 8 },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷', prefix: '+55', maxLength: 11 },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹', prefix: '+502', maxLength: 8 },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳', prefix: '+504', maxLength: 8 },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻', prefix: '+503', maxLength: 8 },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮', prefix: '+505', maxLength: 8 },
  { code: 'PR', name: 'Puerto Rico', flag: '🇵🇷', prefix: '+1', maxLength: 10 },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺', prefix: '+53', maxLength: 8 }
];

interface Props {
  value: string; // The country code (e.g. 'CO')
  onChange: (code: string) => void;
}

export default function PhoneCountrySelector({ value, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = ALL_COUNTRIES.find(c => c.code === value) || ALL_COUNTRIES[0];
  
  const filtered = ALL_COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.prefix.includes(search)
  );

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 h-full px-3 text-xs border-r border-stone-200 hover:bg-stone-100 transition-colors"
      >
        <span className="text-base">{selected.flag}</span>
        <span className="font-mono font-bold text-stone-600">{selected.prefix}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-stone-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b border-stone-100">
            <input
              type="text"
              autoFocus
              placeholder="Buscar país o prefijo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-xs bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 outline-none focus:border-stone-400"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.map(c => (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  onChange(c.code);
                  setIsOpen(false);
                  setSearch('');
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-stone-50 transition-colors ${selected.code === c.code ? 'bg-stone-50 font-bold' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{c.flag}</span>
                  <span className="text-stone-700">{c.name}</span>
                </div>
                <span className="font-mono text-stone-500">{c.prefix}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-xs text-center text-stone-500">
                No se encontraron países
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
