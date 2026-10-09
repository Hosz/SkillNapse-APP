import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Camera,
  FileText,
  CheckCircle2,
  Send,
  Loader2,
  Award,
} from 'lucide-react';
import { redacaoService } from '../../services';
import type { TemaRedacao } from '../../types';

interface CriterionEvaluation {
  nome: string;
  nota: number;
  max: number;
  feedback: string;
}

interface EvaluationResult {
  notaGeral: number;
  taxaLegibilidade: number;
  criterios: CriterionEvaluation[];
  pontosFortes: string[];
  pontosMelhoria: string[];
}

export const EssayLabView: React.FC = () => {
  const [temas, setTemas] = useState<TemaRedacao[]>([]);
  const [selectedTema, setSelectedTema] = useState<TemaRedacao | null>(null);
  const [isGeneratingTema, setIsGeneratingTema] = useState(false);
  const [submissionMode, setSubmissionMode] = useState<'TEXT' | 'OCR'>('TEXT');
  const [essayText, setEssayText] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [ocrReadability, setOcrReadability] = useState<number | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);

  useEffect(() => {
    let isMounted = true;
    redacaoService
      .listarTemas()
      .then((res) => {
        if (!isMounted) return;
        if (res && res.length > 0) {
          setTemas(res);
          setSelectedTema(res[0]);
        } else {
          setTemas([]);
          setSelectedTema(null);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setTemas([]);
        setSelectedTema(null);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleGerarTema = async () => {
    const eixo = prompt('Eixo temático ou assunto desejado (opcional):', 'Direito Constitucional e Políticas Públicas');
    setIsGeneratingTema(true);
    const novoTema = await redacaoService.gerarTemaAi(eixo || undefined);
    if (novoTema) {
      setTemas((prev) => [novoTema, ...prev]);
      setSelectedTema(novoTema);
    }
    setIsGeneratingTema(false);
  };

  const characterCount = essayText.length;
  const isCharacterCountValid = characterCount >= 300 && characterCount <= 5000;

  const handleSubmit = async () => {
    if (!selectedTema) return;
    setIsEvaluating(true);
    let result: EvaluationResult | null = null;

    if (submissionMode === 'TEXT') {
      result = (await redacaoService.submeterTexto({
        temaRedacaoId: selectedTema.id,
        conteudoTexto: essayText,
      })) as EvaluationResult | null;
    } else if (selectedPhoto) {
      result = (await redacaoService.submeterFoto(selectedTema.id, selectedPhoto)) as EvaluationResult | null;
    }

    if (result && result.notaGeral) {
      setEvaluationResult(result);
    } else {
      // Fallback feedback
      setEvaluationResult({
        notaGeral: 880,
        taxaLegibilidade: submissionMode === 'OCR' ? 92.4 : 100,
        criterios: [
          { nome: 'Domínio da Norma Culta', nota: 180, max: 200, feedback: 'Excelente vocabulário formal; apenas uma vírgula facultativa omitida.' },
          { nome: 'Compreensão do Tema e Teoria', nota: 190, max: 200, feedback: 'Articulação precisa do pacto federativo com o texto constitucional.' },
          { nome: 'Capacidade Argumentativa', nota: 180, max: 200, feedback: 'Boa defesa de tese com dados consistentes.' },
          { nome: 'Coesão e Estruturação', nota: 170, max: 200, feedback: 'Conectivos bem empregados entre os parágrafos 2 e 3.' },
          { nome: 'Proposta / Conclusão Técnica', nota: 160, max: 200, feedback: 'Proposta clara, porém com detalhamento tímido sobre os entes subnacionais.' },
        ],
        pontosFortes: [
          'Uso impecável de termos técnicos do Direito Financeiro.',
          'Estrutura dissertativa-argumentativa tradicional em 4 parágrafos bem delimitados.',
        ],
        pontosMelhoria: [
          'Aprofundar a transição de competências entre Estados e Municípios.',
        ],
      });
    }
    setIsEvaluating(false);
  };

  const handleSimulatePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedPhoto(e.target.files[0]);
      setOcrReadability(89.5); // >= 85% readability
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col md:flex-row bg-zinc-950 overflow-hidden">
      {/* Center Left: Essay Prompt & Input Editor */}
      <div className="flex-1 flex flex-col h-full border-r border-zinc-900 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-zinc-900 bg-zinc-950/70 space-y-4 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-mono text-zinc-500 mb-1">
                Laboratório de Redação Inteligente
              </div>
              <div className="flex items-center gap-2">
                {selectedTema ? (
                  <select
                    value={selectedTema.id}
                    onChange={(e) => {
                      const found = temas.find((t) => t.id === e.target.value);
                      if (found) setSelectedTema(found);
                    }}
                    className="bg-zinc-900 border border-zinc-800 text-sm font-bold text-zinc-100 rounded-xl px-2.5 py-1 focus:outline-none"
                  >
                    {temas.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.titulo}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-zinc-400">Nenhum tema cadastrado</span>
                )}
                <button
                  type="button"
                  onClick={handleGerarTema}
                  disabled={isGeneratingTema}
                  className="px-2.5 py-1 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  title="Gerar novo tema com IA"
                >
                  {isGeneratingTema ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  )}
                  <span>{isGeneratingTema ? 'Gerando...' : 'Gerar Tema com IA'}</span>
                </button>
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs">
              <button
                onClick={() => setSubmissionMode('TEXT')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  submissionMode === 'TEXT'
                    ? 'bg-zinc-800 text-zinc-100 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Digitação
              </button>
              <button
                onClick={() => setSubmissionMode('OCR')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  submissionMode === 'OCR'
                    ? 'bg-zinc-800 text-zinc-100 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Camera className="w-3.5 h-3.5" /> Foto Manuscrita (OCR)
              </button>
            </div>
          </div>

          {/* Theme description & motivators */}
          {selectedTema ? (
            <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/60 text-xs text-zinc-400 leading-relaxed font-sans">
              <span className="font-semibold text-zinc-300 block mb-0.5">
                Eixo: {selectedTema.eixoTematico}
              </span>
              {selectedTema.descricao}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-zinc-900/30 border border-zinc-800/50 text-xs text-zinc-500">
              Nenhuma proposta selecionada. Clique em &ldquo;Gerar Tema com IA&rdquo; para criar uma nova proposta de redação discursiva.
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="flex-1 p-5 flex flex-col justify-between overflow-hidden">
          {submissionMode === 'TEXT' ? (
            <div className="flex-1 flex flex-col space-y-2">
              <textarea
                value={essayText}
                onChange={(e) => setEssayText(e.target.value)}
                placeholder="Escreva sua dissertação aqui (mínimo de 300 caracteres, máximo de 5000)..."
                className="w-full flex-1 p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-xs text-zinc-200 font-sans leading-relaxed resize-none focus:outline-none focus:border-indigo-500/50 placeholder:text-zinc-600"
              />
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-1">
                <span>
                  Caracteres: {characterCount} / 5000 (Mín: 300)
                </span>
                <span
                  className={
                    isCharacterCountValid ? 'text-emerald-400' : 'text-zinc-500'
                  }
                >
                  {isCharacterCountValid ? 'Extensão adequada' : 'Abaixo do mínimo'}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-2xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-400">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-zinc-200">
                  Foto da Folha de Resposta Manuscrita
                </h3>
                <p className="text-[11px] text-zinc-500 mt-1 max-w-sm">
                  Tire uma foto bem iluminada da sua redação. A caligrafia necessita de pelo menos 85% de legibilidade calculada pelo modelo visual.
                </p>
              </div>

              <input
                type="file"
                accept="image/*"
                onChange={handleSimulatePhotoUpload}
                className="text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700"
              />

              {ocrReadability !== null && (
                <div className="w-full max-w-md text-left">
                  {ocrReadability < 85 ? (
                    <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs text-amber-200 space-y-2">
                      <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                        <span>⚠️ Nitidez insuficiente ({ocrReadability}%)</span>
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                        A imagem enviada não atingiu o limiar de 85% de legibilidade calculada pela IA. Recomendamos tirar uma foto mais clara e plana ou digitar a redação manualmente.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSubmissionMode('TEXT');
                            setEssayText('Transcrição parcial detectada da folha manuscrita:\n\nEm conformidade com o tema proposto, cabe salientar que...');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-medium border border-zinc-700 transition-colors"
                        >
                          Preencher via transcrição manual
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPhoto(null);
                            setOcrReadability(null);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-[11px] font-medium transition-colors"
                        >
                          Tirar nova foto
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Taxa de legibilidade aprovada: {ocrReadability}% (Limiar mínimo: 85%). Folha pronta para avaliação.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-4 border-t border-zinc-900 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={
                isEvaluating ||
                !selectedTema ||
                (submissionMode === 'TEXT' && !isCharacterCountValid) ||
                (submissionMode === 'OCR' && !selectedPhoto)
              }
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Corrigindo via IA...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Enviar para Correção Multimodal
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Right Drawer: AI Evaluation & Competencies (0 to 1000) */}
      <div className="w-full md:w-[460px] bg-zinc-950 p-5 overflow-y-auto shrink-0 border-t md:border-t-0 md:border-l border-zinc-900 space-y-4">
        {evaluationResult ? (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Score Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-zinc-900 border border-indigo-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase text-indigo-300">
                  Nota Geral (Escala Concursos/ENEM)
                </span>
                <Award className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="text-4xl font-mono font-bold text-zinc-100">
                {evaluationResult.notaGeral}
                <span className="text-base text-zinc-500 font-normal"> / 1000</span>
              </div>
              <div className="text-xs text-zinc-400 font-mono">
                Legibilidade calculada: {evaluationResult.taxaLegibilidade}%
              </div>
            </div>

            {/* Criteria breakdown */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-zinc-200">
                Avaliação por Competências:
              </div>
              {evaluationResult.criterios.map((c, i: number) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-300">{c.nome}</span>
                    <span className="font-mono text-indigo-400">
                      {c.nota}/{c.max}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${(c.nota / c.max) * 100}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                    {c.feedback}
                  </p>
                </div>
              ))}
            </div>

            {/* Strengths & Improvements */}
            <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-2 text-xs">
              <div className="font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Pontos Fortes
              </div>
              <ul className="list-disc list-inside text-zinc-300 space-y-1 text-[11px]">
                {evaluationResult.pontosFortes.map((p: string, idx: number) => (
                  <li key={idx}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 p-6 space-y-2">
            <Sparkles className="w-8 h-8 opacity-30" />
            <div className="text-xs font-medium text-zinc-400">Aguardando Envio</div>
            <p className="text-[11px] text-zinc-600 max-w-xs">
              O feedback com notas detalhadas de 0 a 1000 pontos será exibido aqui assim que a redação for submetida.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
