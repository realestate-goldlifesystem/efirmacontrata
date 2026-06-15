import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import estructuraForm from '../estructura_form.json';

interface FeaturesGridSelectorProps {
  onAnswersChange: (answers: Record<string, string>) => void;
  category?: 'internas' | 'externas' | 'todas';
  currentAnswers: Record<string, string>;
}

export default function FeaturesGridSelector({ onAnswersChange, category = 'todas', currentAnswers }: FeaturesGridSelectorProps) {

  // Filter only the GRID components that have single or multiple options
  let grids = estructuraForm.items.filter(
    (item) => item.tipo === 'GRID' || item.tipo === 'CHECKBOX_GRID'
  );

  if (category === 'internas') {
    grids = grids.filter(g => g.filas && g.filas.some(f => f.toLowerCase().includes('interna')));
  } else if (category === 'externas') {
    grids = grids.filter(g => g.filas && !g.filas.some(f => f.toLowerCase().includes('interna')));
  }

  const toggleAnswer = (row: string, col: string, gridTitle: string = '') => {
    // Format the key EXACTLY as it appears in the Google Sheet headers
    const key = gridTitle.trim() ? `${gridTitle} [${row}]` : `[${row}]`;
    
    const next = { ...currentAnswers };
    // If it's a SI/NO grid, we allow toggling between SI and NO
    if (next[key] === col) {
      delete next[key]; // Unselect if already selected
    } else {
      next[key] = col;
    }
    onAnswersChange(next);
  };

  return (
    <div className="space-y-6">
      {grids.map((grid) => {
        const isSiNo = grid.columnas?.includes('SI') && grid.columnas?.includes('NO');
        
        return (
          <div key={grid.id} className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3">
            {grid.titulo && <span className="text-sm font-bold text-stone-800 block">{grid.titulo}</span>}
            {grid.ayuda && <span className="text-xs text-stone-500 block mb-2">{grid.ayuda}</span>}
            
            {isSiNo ? (
              // For SI/NO grids (e.g., Parques Cercanos)
              <div className="space-y-2">
                {grid.filas?.map((row) => (
                  <div key={row} className="flex items-center justify-between bg-white p-2 border border-stone-100 rounded-lg text-xs">
                    <span className="font-semibold text-stone-700">{row}</span>
                    <div className="flex space-x-2">
                      {grid.columnas?.map((col) => {
                        const key = grid.titulo ? `${grid.titulo} [${row}]` : `[${row}]`;
                        const isSelected = currentAnswers[key] === col;
                        return (
                          <button
                            key={col}
                            type="button"
                            onClick={() => toggleAnswer(row, col, grid.titulo || '')}
                            className={`px-3 py-1 rounded-md transition-colors ${
                              isSelected 
                                ? col === 'SI' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-stone-100 text-stone-500 border border-stone-200 hover:bg-stone-200'
                            }`}
                          >
                            {col}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // For Features grids (e.g., Gimnasio, Balcón) - Render as nice chips
              <div className="flex flex-wrap gap-2">
                {grid.filas?.map((row, idx) => {
                  // Usually the only column for this row is at the same index, or there's only 1 matching column.
                  // Google Forms extracted grids have 1 column per row if it was a Multiple Choice grid mapped as a list.
                  // We'll use the column that corresponds to this row if possible, or just the first column if it's a 1x1 match.
                  let colToSelect = grid.columnas?.[idx] || grid.columnas?.[0] || 'SI';
                  // Clean up the column name from weird characters
                  const cleanCol = colToSelect.replace(/[•ㅤ]/g, '').trim();
                  const cleanRow = row.replace(/Zona (interna|comunal|húmedas) #\d+ /, '').replace(/Cancha deportiva #\d+ /, '').replace(/Tipo de zona #\d+ /, '').trim();

                  const key = grid.titulo ? `${grid.titulo} [${row}]` : `[${row}]`;
                  const isSelected = currentAnswers[key] === colToSelect;

                  return (
                    <button
                      key={row}
                      type="button"
                      onClick={() => toggleAnswer(row, colToSelect, grid.titulo || '')}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                        isSelected
                          ? 'bg-brand-gold/10 text-brand-gold-dark border-brand-gold shadow-sm'
                          : 'bg-white text-stone-500 border-stone-200 hover:border-brand-gold/50'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      <span>{cleanRow}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
