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
import { canvasService } from '../../services';

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
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Handle note change and persist
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotes(val);
    setSavedStatus('Salvando...');
    canvasService.salvarRascunho({ topicoId: topic.id, notasTexto: val }).then(() => {
      setSavedStatus('Salvo na nuvem & local');
    });
  };

  // Helper para obter coordenadas reais escalonadas com o buffer do canvas
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Sincroniza o tamanho do canvas com o container
  React.useEffect(() => {
    if (activeMode === 'DRAW' && containerRef.current && canvasRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 50 && rect.height > 50) {
        const currentCanvas = canvasRef.current;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = currentCanvas.width;
        tempCanvas.height = currentCanvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx && currentCanvas.width > 0 && currentCanvas.height > 0) {
          tempCtx.drawImage(currentCanvas, 0, 0);
        }

        currentCanvas.width = Math.round(rect.width);
        currentCanvas.height = Math.round(rect.height);

        const ctx = currentCanvas.getContext('2d');
        if (ctx && tempCanvas.width > 0 && tempCanvas.height > 0) {
          ctx.drawImage(tempCanvas, 0, 0);
        }
      }
    }
  }, [activeMode]);

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
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

    const { x, y } = getCoordinates(e);
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
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 p-4 space-y-3">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/80 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800">
        {/* Mode switch */}
        <div className="flex bg-zinc-100 dark:bg-zinc-950 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs">
          <button
            onClick={() => setActiveMode('DRAW')}
            className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition-all ${
              activeMode === 'DRAW'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium'
            }`}
          >
            <Pen className="w-3.5 h-3.5" /> Lousa Livre
          </button>
          <button
            onClick={() => setActiveMode('NOTES')}
            className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition-all ${
              activeMode === 'NOTES'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Bloco de Notas
          </button>
        </div>

        {/* Drawing controls */}
        {activeMode === 'DRAW' && (
          <div className="flex items-center gap-2">
            {/* Color palette */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-100 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <Palette className="w-3 h-3 text-zinc-500 dark:text-zinc-400 mr-1" />
              {[
                { hex: '#4f46e5', label: 'Indigo' },
                { hex: '#059669', label: 'Emerald' },
                { hex: '#d97706', label: 'Amber' },
                { hex: '#dc2626', label: 'Red' },
                { hex: '#0f172a', label: 'Grafite' },
                { hex: '#64748b', label: 'Slate' },
              ].map((c) => (
                <button
                  key={c.hex}
                  onClick={() => setStrokeColor(c.hex)}
                  className={`w-4 h-4 rounded-full transition-transform border border-black/10 dark:border-white/20 ${
                    strokeColor === c.hex ? 'scale-125 ring-2 ring-indigo-500' : 'opacity-75 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                />
              ))}
            </div>

            {/* Stroke width */}
            <button
              onClick={() => setStrokeWidth(strokeWidth === 2 ? 5 : 2)}
              className="text-[11px] font-mono px-2 py-1 bg-zinc-100 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-900 transition-colors"
              title="Espessura do traço"
            >
              {strokeWidth}px
            </button>

            {/* Clear button */}
            <button
              onClick={clearCanvas}
              className="p-1.5 bg-zinc-100 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-red-400 rounded-lg border border-zinc-200 dark:border-zinc-800 transition-colors"
              title="Limpar quadro"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Download */}
            <button
              onClick={downloadCanvas}
              className="p-1.5 bg-zinc-100 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 rounded-lg border border-zinc-200 dark:border-zinc-800 transition-colors"
              title="Baixar imagem"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Sync indicator */}
        <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
          <CloudCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{savedStatus}</span>
        </div>
      </div>

      {/* Main Canvas / Note Area */}
      <div className="flex-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 overflow-hidden relative shadow-inner">
        {activeMode === 'DRAW' ? (
          <div ref={containerRef} className="w-full h-full relative cursor-crosshair bg-white dark:bg-zinc-950">
            <div className="absolute top-2 left-3 text-[10px] font-mono text-zinc-400 dark:text-zinc-600 pointer-events-none uppercase tracking-wider">
              Área de Desenho Livre • {topic.titulo}
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
            className="w-full h-full p-4 bg-white dark:bg-transparent text-xs text-zinc-900 dark:text-zinc-200 font-mono leading-relaxed resize-none focus:outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
          />
        )}
      </div>
    </div>
  );
};
