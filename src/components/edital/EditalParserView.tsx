import React, { useState, useEffect } from 'react';
import {
  FileUp,
  FileCheck,
  Sparkles,
  Loader2,
  CheckCircle2,
  Layers,
  ArrowRight,
  AlertCircle,
  Clock,
  Trash2,
} from 'lucide-react';
import { editalService } from '../../services';
import type { RascunhoEditalResponse } from '../../services/editalService';

interface EditalParserViewProps {
  onPlanCreated?: () => void;
}

export const EditalParserView: React.FC<EditalParserViewProps> = ({ onPlanCreated }) => {
  const [cargoAlvo, setCargoAlvo] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rascunho, setRascunho] = useState<RascunhoEditalResponse | null>(null);
  const [tituloPlano, setTituloPlano] = useState('');
  const [descricaoPlano, setDescricaoPlano] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Lista de rascunhos anteriores salvos no backend
  const [rascunhosSalvos, setRascunhosSalvos] = useState<RascunhoEditalResponse[]>([]);
  const [isLoadingRascunhos, setIsLoadingRascunhos] = useState(true);

  useEffect(() => {
    let isMounted = true;
    editalService
      .listarRascunhos()
      .then((lista) => {
        if (!isMounted) return;
        setRascunhosSalvos(
          lista.filter((r) => r.status === 'AGUARDANDO_APROVACAO' || r.status === 'PROCESSANDO')
        );
      })
      .catch(() => {
        // Ignora erro
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingRascunhos(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectDraft = (draft: RascunhoEditalResponse) => {
    setRascunho(draft);
    const concurso = draft.conteudo?.nomeConcurso || 'Concurso Público';
    const cargo = draft.conteudo?.cargo || 'Geral';
    const defaultTitulo = `${concurso} - ${cargo}`;
    setTituloPlano(defaultTitulo.length > 150 ? defaultTitulo.substring(0, 150) : defaultTitulo);
    setDescricaoPlano(`Plano extraído via IA a partir do edital ${draft.nomeArquivo}`);
    setErrorMessage(null);
  };

  const handleDeleteDraft = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Deseja excluir este rascunho de edital?')) return;
    await editalService.excluirRascunho(id);
    if (rascunho?.id === id) {
      setRascunho(null);
    }
    setRascunhosSalvos((prev) => prev.filter((r) => r.id !== id));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
        setErrorMessage('Por favor, selecione um arquivo no formato PDF.');
        setSelectedFile(null);
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        setErrorMessage('O arquivo excede o limite máximo permitido de 25 MB.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadAndParse = async () => {
    if (!selectedFile) {
      setErrorMessage('Por favor, selecione um arquivo PDF antes de processar.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const parsed = await editalService.parseEdital(selectedFile, cargoAlvo);

      if (parsed && parsed.conteudo && parsed.conteudo.materias) {
        setRascunho(parsed);
        const concurso = parsed.conteudo.nomeConcurso || 'Concurso Público';
        const cargo = parsed.conteudo.cargo || cargoAlvo || 'Geral';
        const defaultTitulo = `${concurso} - ${cargo}`;
        setTituloPlano(defaultTitulo.length > 150 ? defaultTitulo.substring(0, 150) : defaultTitulo);
        setDescricaoPlano(`Plano extraído via IA a partir do edital ${parsed.nomeArquivo}`);
        setRascunhosSalvos((prev) => [parsed, ...prev.filter((r) => r.id !== parsed.id)]);
      } else {
        throw new Error('Não foi possível identificar as matérias e tópicos no PDF fornecido.');
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Erro ao processar o edital via IA. Certifique-se de que o documento contém texto programático legível.';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConvertToPlan = async () => {
    if (!rascunho) return;

    if (!tituloPlano.trim()) {
      setErrorMessage('Por favor, informe o título do plano de estudos.');
      return;
    }

    setIsConverting(true);
    setErrorMessage(null);

    try {
      const conversao = await editalService.converterParaPlano(rascunho.id, {
        tituloPlano: tituloPlano.trim(),
        descricaoPlano: descricaoPlano.trim() || undefined,
      });

      if (conversao && conversao.planoEstudoId) {
        setSuccessMessage('Plano de estudos criado com sucesso!');
        if (onPlanCreated) {
          onPlanCreated();
        }
      } else {
        throw new Error('Falha na conversão do rascunho em plano de estudo.');
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Falha ao converter o rascunho do edital em plano ativo.';
      setErrorMessage(msg);
    } finally {
      setIsConverting(false);
    }
  };

  const totalMaterias = rascunho?.conteudo?.materias?.length || 0;
  const totalTopicos =
    rascunho?.conteudo?.materias?.reduce((acc, m) => acc + (m.topicos?.length || 0), 0) || 0;

  return (
    <div className="flex-1 h-full flex flex-col md:flex-row bg-zinc-950 overflow-hidden font-sans select-none">
      {/* Coluna Esquerda: Upload, Configuração e Rascunhos Anteriores */}
      <div className="flex-1 flex flex-col h-full border-r border-zinc-900 overflow-y-auto p-6 space-y-6">
        <div>
          <div className="text-xs font-mono text-zinc-500 mb-1">
            Módulo de Inteligência Artificial
          </div>
          <h1 className="text-lg font-bold text-zinc-100 tracking-tight">
            Processamento Inteligente de Edital (PDF)
          </h1>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Faça upload do PDF oficial do edital. O modelo analisa a grade de Conteúdo Programático, decompõe as matérias em tópicos temáticos com subtópicos e atribui pesos calculados por relevância no concurso.
          </p>
        </div>

        {/* Feedback de Erro */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Feedback de Sucesso */}
        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{successMessage}</div>
          </div>
        )}

        {/* Campo de Cargo Alvo */}
        <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-2">
          <label className="text-xs font-semibold text-zinc-300 block">
            Cargo Alvo Desejado (Opcional):
          </label>
          <input
            type="text"
            value={cargoAlvo}
            onChange={(e) => setCargoAlvo(e.target.value)}
            placeholder="Ex: Auditor-Fiscal da Receita Federal (RFB), Analista Judiciário..."
            className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-indigo-500/50 placeholder:text-zinc-600 font-sans"
          />
          <p className="text-[11px] text-zinc-500">
            Filtrar por cargo alvo instrui a IA a focar exclusivamente nas matérias daquele cargo, ignorando disciplinas dos demais cargos do edital.
          </p>
        </div>

        {/* Zona de Upload de PDF */}
        <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3 bg-zinc-900/20">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-400">
            <FileUp className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-zinc-200">
              {selectedFile ? selectedFile.name : 'Selecione o arquivo PDF do edital'}
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Formatos aceitos: PDF oficial de até 25 MB
              {selectedFile && ` • ${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`}
            </p>
          </div>

          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFileChange}
            className="text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
          />

          <button
            onClick={handleUploadAndParse}
            disabled={isProcessing || !selectedFile}
            className="mt-3 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Extraindo Conteúdo Programático via IA...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Processar Edital via IA
              </>
            )}
          </button>
        </div>

        {/* Rascunhos Anteriores Salvos */}
        {rascunhosSalvos.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                Rascunhos Anteriores Aguardando Aprovação:
              </span>
              {isLoadingRascunhos && <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />}
            </div>

            <div className="space-y-2">
              {rascunhosSalvos.map((draft) => (
                <div
                  key={draft.id}
                  onClick={() => handleSelectDraft(draft)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                    rascunho?.id === draft.id
                      ? 'bg-indigo-950/30 border-indigo-500/50 text-zinc-100'
                      : 'bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-900 hover:border-zinc-700 text-zinc-300'
                  }`}
                >
                  <div className="space-y-0.5 min-w-0 pr-3">
                    <div className="font-semibold truncate">
                      {draft.conteudo?.nomeConcurso || draft.nomeArquivo}
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono truncate">
                      Cargo: {draft.conteudo?.cargo || 'Não especificado'} •{' '}
                      {draft.conteudo?.materias?.length || 0} matérias
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleDeleteDraft(draft.id, e)}
                      className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Excluir rascunho"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Coluna Direita: Pré-visualização da Árvore Estruturada e Conversão em Plano */}
      <div className="w-full md:w-[480px] bg-zinc-950 p-6 border-t md:border-t-0 md:border-l border-zinc-900 flex flex-col justify-between overflow-y-auto">
        {isProcessing ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400 p-6 space-y-3">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
            <div className="text-sm font-semibold text-zinc-200">
              Analisando Edital com Inteligência Artificial
            </div>
            <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
              O modelo está lendo o conteúdo programático do documento, agrupando matérias, extraindo tópicos e calculando pesos pedagógicos de 1 a 10. Aguarde alguns instantes...
            </p>
          </div>
        ) : rascunho && rascunho.conteudo ? (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> Extração Concluída com Sucesso
              </div>
              <h2 className="text-base font-bold text-zinc-100 mt-1">
                {rascunho.conteudo.nomeConcurso || 'Concurso Identificado'}
              </h2>
              <div className="text-xs text-zinc-400 font-mono mt-0.5">
                Cargo Alvo: {rascunho.conteudo.cargo || 'Geral'} • {totalMaterias} matérias • {totalTopicos} tópicos
              </div>
            </div>

            {/* Configuração de Título do Plano Final */}
            <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
              <label className="text-[11px] font-semibold text-zinc-300 block font-mono uppercase">
                Título Oficial do Plano de Estudos:
              </label>
              <input
                type="text"
                value={tituloPlano}
                maxLength={150}
                onChange={(e) => setTituloPlano(e.target.value)}
                placeholder="Ex: Auditor-Fiscal da Receita Federal 2026"
                className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Listagem de Matérias e Tópicos Extraídos */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-zinc-300">
                Árvore Programática Extraída:
              </div>
              {rascunho.conteudo.materias.map((m, idx: number) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2.5"
                >
                  <div className="text-xs font-medium text-zinc-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      <span className="font-semibold">{m.nome}</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {m.topicos?.length || 0} tópicos
                    </span>
                  </div>

                  <div className="pl-4 space-y-2 border-l border-zinc-800/80">
                    {m.topicos?.map((top, tIdx: number) => (
                      <div key={tIdx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-zinc-300">
                          <span className="font-medium">• {top.titulo}</span>
                          <span
                            className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
                              (top.pesoEdital || 5) >= 8
                                ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                                : (top.pesoEdital || 5) >= 5
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                            }`}
                          >
                            Peso {top.pesoEdital || 5}/10
                          </span>
                        </div>

                        {/* Subtópicos ricos */}
                        {top.subtopicos && top.subtopicos.length > 0 && (
                          <div className="pl-3 flex flex-wrap gap-1 pt-0.5">
                            {top.subtopicos.map((sub, sIdx) => (
                              <span
                                key={sIdx}
                                className="text-[10px] bg-zinc-800/70 border border-zinc-700/50 text-zinc-400 rounded-md px-1.5 py-0.5 leading-tight"
                              >
                                {sub}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Ação de Conversão em Plano Ativo */}
            <button
              onClick={handleConvertToPlan}
              disabled={isConverting}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
            >
              {isConverting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Convertendo em Plano de Estudos...
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  Converter em Plano de Estudo Ativo
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 p-6 space-y-2">
            <Layers className="w-8 h-8 opacity-30" />
            <div className="text-xs font-medium text-zinc-400">Prévia do Plano de Estudo</div>
            <p className="text-[11px] text-zinc-600 max-w-xs leading-relaxed">
              Após enviar o PDF, a árvore estruturada com matérias, tópicos, subtópicos e pesos calculados pela IA aparecerá aqui para sua validação.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
