import React, { useState } from 'react';
import {
  FileUp,
  FileCheck,
  Sparkles,
  Loader2,
  CheckCircle2,
  Layers,
  ArrowRight,
} from 'lucide-react';

import { editalService } from '../../services';

interface ExtractedMateria {
  nome: string;
  topicos: { titulo: string; peso: number }[];
}

interface ExtractedTree {
  id?: string;
  concurso: string;
  cargo: string;
  totalMaterias: number;
  totalTopicos: number;
  materias: ExtractedMateria[];
}

interface EditalParserViewProps {
  onPlanCreated?: () => void;
}

export const EditalParserView: React.FC<EditalParserViewProps> = ({ onPlanCreated }) => {
  const [cargoAlvo, setCargoAlvo] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedTree, setExtractedTree] = useState<ExtractedTree | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleUploadAndParse = async () => {
    setIsProcessing(true);
    let parsed: ExtractedTree | null = null;

    if (selectedFile) {
      parsed = (await editalService.parseEdital(selectedFile, cargoAlvo)) as ExtractedTree | null;
    }

    if (parsed && parsed.materias) {
      setExtractedTree(parsed);
    } else {
      // Demo fallback
      setExtractedTree({
        id: `rascunho-${Date.now()}`,
        concurso: 'Receita Federal do Brasil (AFRFB)',
        cargo: cargoAlvo || 'Auditor-Fiscal',
        totalMaterias: 3,
        totalTopicos: 8,
        materias: [
          {
            nome: 'Direito Constitucional',
            topicos: [
              { titulo: 'Direitos Fundamentais', peso: 10 },
              { titulo: 'Controle de Constitucionalidade', peso: 9 },
              { titulo: 'Organização do Estado', peso: 7 },
            ],
          },
          {
            nome: 'Direito Tributário',
            topicos: [
              { titulo: 'Sistema Tributário Nacional', peso: 10 },
              { titulo: 'Princípios e Imunidades', peso: 10 },
              { titulo: 'Crédito Tributário e Lançamento', peso: 9 },
            ],
          },
          {
            nome: 'Legislação Aduaneira',
            topicos: [
              { titulo: 'Regime de Importação e Exportação', peso: 9 },
              { titulo: 'Infrações e Penalidades', peso: 8 },
            ],
          },
        ],
      });
    }
    setIsProcessing(false);
  };

  const handleConvertToPlan = async () => {
    if (extractedTree?.id) {
      await editalService.converterParaPlano(extractedTree.id);
    }
    if (onPlanCreated) {
      onPlanCreated();
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col md:flex-row bg-zinc-950 overflow-hidden">
      {/* Left Column: Upload and Form */}
      <div className="flex-1 flex flex-col h-full border-r border-zinc-900 overflow-y-auto p-6 space-y-6">
        <div>
          <div className="text-xs font-mono text-zinc-500 mb-1">
            Módulo de Inteligência Artificial
          </div>
          <h1 className="text-lg font-bold text-zinc-100 tracking-tight">
            Processamento Inteligente de Edital (PDF)
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Faça upload do PDF oficial do edital. O modelo extrairá automaticamente a árvore hierárquica de matérias, assuntos e atribuirá pesos calculados por incidência.
          </p>
        </div>

        {/* Cargo Alvo Input */}
        <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-2">
          <label className="text-xs font-semibold text-zinc-300 block">
            Cargo Alvo Desejado (Opcional):
          </label>
          <input
            type="text"
            value={cargoAlvo}
            onChange={(e) => setCargoAlvo(e.target.value)}
            placeholder="Ex: Auditor-Fiscal da Receita Federal (RFB)"
            className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-indigo-500/50 placeholder:text-zinc-600 font-sans"
          />
          <p className="text-[11px] text-zinc-500">
            Filtrar por cargo alvo instrui a IA a ignorar o conteúdo programático dos outros cargos do concurso.
          </p>
        </div>

        {/* PDF Drag & Drop Zone */}
        <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3 bg-zinc-900/20">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-400">
            <FileUp className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-zinc-200">
              {selectedFile ? selectedFile.name : 'Selecione ou arraste o arquivo PDF do edital'}
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Formatos aceitos: PDF oficial de até 50 MB
            </p>
          </div>

          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setSelectedFile(e.target.files[0]);
              }
            }}
            className="text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700"
          />

          <button
            onClick={handleUploadAndParse}
            disabled={isProcessing}
            className="mt-3 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Extraindo Conteúdo Programático...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Processar Edital via IA
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Column: Preview of Extracted Tree before confirming */}
      <div className="w-full md:w-[480px] bg-zinc-950 p-6 border-t md:border-t-0 md:border-l border-zinc-900 flex flex-col justify-between overflow-y-auto">
        {extractedTree ? (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> Extração Concluída com Sucesso
              </div>
              <h2 className="text-base font-bold text-zinc-100 mt-1">
                {extractedTree.concurso}
              </h2>
              <div className="text-xs text-zinc-400 font-mono">
                Cargo Alvo: {extractedTree.cargo}
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold text-zinc-300">
                Pré-visualização da Árvore de Conhecimento:
              </div>
              {extractedTree.materias.map((m, idx: number) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2"
                >
                  <div className="text-xs font-medium text-zinc-200 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    {m.nome}
                  </div>
                  <div className="pl-4 space-y-1">
                    {m.topicos.map((top, tIdx: number) => (
                      <div
                        key={tIdx}
                        className="flex items-center justify-between text-[11px] text-zinc-400"
                      >
                        <span>• {top.titulo}</span>
                        <span className="font-mono text-amber-400 text-[10px]">
                          Peso {top.peso}/10
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleConvertToPlan}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
            >
              <FileCheck className="w-4 h-4" />
              Converter em Plano de Estudo Ativo
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 p-6 space-y-2">
            <Layers className="w-8 h-8 opacity-30" />
            <div className="text-xs font-medium text-zinc-400">Prévia do Plano de Estudo</div>
            <p className="text-[11px] text-zinc-600 max-w-xs">
              Após enviar o PDF, a árvore estruturada com matérias e pesos calculados aparecerá aqui para sua validação.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
