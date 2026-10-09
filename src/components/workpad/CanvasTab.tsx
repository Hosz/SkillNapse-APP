import React, { useRef, useState } from 'react';
import {
  Pen,
  RotateCcw,
  FileText,
  Palette,
  CloudCheck,
  Download,
} from 'lucide-react';
import type { Topico } from '../../types';

interface CanvasTabProps {
  topic: Topico;
}

export const CanvasTab: React.FC<CanvasTabProps> = ({ topic }) => {
  const [activeMode, setActiveMode] = useState<'DRAW' | 'NOTES'>('DRAW');
  const [strokeColor, setStrokeColor] = useState('#6366f1'); // violet
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [savedStatus, setSavedStatus] = useState('Salvo automaticamente');

  // Text notes state with persistence by topic ID
  const [notes, setNotes] = useState(() => {
    return (
      localStorage.getItem(`skillnapse_notes_${topic.id}`) ||
      `# Mnemônicos e Resumo Rápido — ${topic.titulo}\n\n• Regra Geral:\n• Exceções importantes a lembrar:\n• Pontos de alta recorrência em provas:`
    );
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Handle note change and persist
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotes(val);
    localStorage.setItem(`skillnapse_notes_${topic.id}`, val);
    setSavedStatus('Salvando...');
    setTimeout(() => setSavedStatus('Salvo automaticamente'), 600);
  };

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setSavedStatus('Salvando...');
    setTimeout(() => setSavedStatus('Salvo automaticamente'), 500);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `rascunho-${topic.id}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 p-4 space-y-3">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
        {/* Mode switch */}
        <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 text-xs">
          <button
            onClick={() => setActiveMode('DRAW')}
            className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition-all ${
              activeMode === 'DRAW'
                ? 'bg-zinc-800 text-zinc-100 font-medium shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Pen className="w-3.5 h-3.5" /> Lousa Livre
          </button>
          <button
            onClick={() => setActiveMode('NOTES')}
            className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition-all ${
              activeMode === 'NOTES'
                ? 'bg-zinc-800 text-zinc-100 font-medium shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Bloco de Notas
          </button>
        </div>

        {/* Drawing controls */}
        {activeMode === 'DRAW' && (
          <div className="flex items-center gap-2">
            {/* Color palette */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-950 rounded-lg border border-zinc-800">
              <Palette className="w-3 h-3 text-zinc-500 mr-1" />
              {[
                { hex: '#6366f1', label: 'Indigo' },
                { hex: '#10b981', label: 'Emerald' },
                { hex: '#f59e0b', label: 'Amber' },
                { hex: '#ef4444', label: 'Red' },
                { hex: '#f4f4f5', label: 'White' },
              ].map((c) => (
                <button
                  key={c.hex}
                  onClick={() => setStrokeColor(c.hex)}
                  className={`w-4 h-4 rounded-full transition-transform ${
                    strokeColor === c.hex ? 'scale-125 ring-2 ring-white/50' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                />
              ))}
            </div>

            {/* Stroke width */}
            <button
              onClick={() => setStrokeWidth(strokeWidth === 2 ? 5 : 2)}
              className="text-[11px] font-mono px-2 py-1 bg-zinc-950 text-zinc-300 rounded-lg border border-zinc-800 hover:text-zinc-100"
              title="Espessura do traço"
            >
              {strokeWidth}px
            </button>

            {/* Clear button */}
            <button
              onClick={clearCanvas}
              className="p-1.5 bg-zinc-950 text-zinc-400 hover:text-red-400 rounded-lg border border-zinc-800 transition-colors"
              title="Limpar quadro"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Download */}
            <button
              onClick={downloadCanvas}
              className="p-1.5 bg-zinc-950 text-zinc-400 hover:text-zinc-200 rounded-lg border border-zinc-800 transition-colors"
              title="Baixar imagem"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Sync indicator */}
        <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-500">
          <CloudCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>{savedStatus}</span>
        </div>
      </div>

      {/* Main Canvas / Note Area */}
      <div className="flex-1 rounded-2xl border border-zinc-800/90 bg-zinc-900/30 overflow-hidden relative">
        {activeMode === 'DRAW' ? (
          <div className="w-full h-full relative cursor-crosshair">
            <div className="absolute top-2 left-3 text-[10px] font-mono text-zinc-600 pointer-events-none uppercase tracking-wider">
              Área de Desenho Vetorial Livre • {topic.titulo}
            </div>
            <canvas
              ref={canvasRef}
              width={700}
              height={550}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="w-full h-full block"
            />
          </div>
        ) : (
          <textarea
            value={notes}
            onChange={handleNotesChange}
            placeholder="Digite suas anotações, fórmulas e mnemônicos deste tópico..."
            className="w-full h-full p-4 bg-transparent text-xs text-zinc-200 font-mono leading-relaxed resize-none focus:outline-none placeholder:text-zinc-600"
          />
        )}
      </div>
    </div>
  );
};
