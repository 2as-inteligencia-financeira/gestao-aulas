import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BudgetImpact } from './BudgetImpact';
import { CardMovePanel } from './CardMovePanel';
import { PHASES } from '../data/phases';

function brl(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

// Tipo de solicitação → tipo interno para lógica de campos
function tipoProducao(tipoSol) {
  if (tipoSol === 'Vídeo')           return 'Video';
  if (tipoSol === 'Material Escrito') return 'Material';
  return null;
}

const TIPOS = ['Vídeo', 'Material Escrito'];
const CENTROS_CUSTO = ['Academico', 'Marketing'];

const EMPTY = {
  centro_custo:      'Academico',
  tipo_solicitacao:  '',
  professor_id:      '',
  disciplina:        '',
  assunto:           '',
  concurso:          '',
  prazo:             '',
  data_prova:        '',
  tempo_horas:       '',
  tempo_minutos:     '',
  pag_teoria:        '',
  pag_questoes_com:  '',
  pag_questoes_in:   '',
  observacoes:       '',
  proposta_diretrizes: '',
  proposta_prazo_aceite: '',
  proposta_status: 'Proposta enviada',
  proposta_motivo: '',
  proposta_objetos:  [{ nome: '', link: '' }],
  agenda_tipo: '',
  agenda_modalidade: '',
  agenda_inicio: '',
  agenda_fim: '',
  agenda_evento_nome: '',
  agenda_invites: [''],
  gravacao_conteudo_gravado: '',
  gravacao_data: '',
  gravacao_link_arquivo: '',
  gravacao_material_apoio_link: '',
  gravacao_justificativa: '',
  publicacao_data: '',
  publicacao_link: '',
};

function formFromCard(card) {
  if (!card) return EMPTY;

  const tg = card.tempo_gravacao ?? 0;
  const tipoSol = card.tipo_solicitacao
    ?? (card.tipo_producao === 'Video' ? 'Vídeo'
      : card.tipo_producao === 'Material' ? 'Material Escrito' : '');

  return {
    tipo_solicitacao:  tipoSol,
    centro_custo:      card.centro_custo      ?? 'Academico',
    professor_id:      card.professor_id     ?? '',
    disciplina:        card.disciplina       ?? '',
    assunto:           card.assunto          ?? '',
    concurso:          card.concurso         ?? '',
    prazo:             card.prazo            ?? '',
    data_prova:        card.data_prova       ?? '',
    tempo_horas:       tg ? String(Math.floor(tg)) : '',
    tempo_minutos:     tg ? String(Math.round((tg % 1) * 60)) : '',
    pag_teoria:        card.pag_teoria       ?? '',
    pag_questoes_com:  card.pag_questoes_com ?? '',
    pag_questoes_in:   card.pag_questoes_in  ?? '',
    observacoes:       card.observacoes      ?? '',
    proposta_diretrizes: card.proposta_diretrizes ?? '',
    proposta_prazo_aceite: card.proposta_prazo_aceite ?? '',
    proposta_status: card.proposta_status ?? 'Proposta enviada',
    proposta_motivo: card.proposta_motivo ?? '',
    proposta_objetos:  Array.isArray(card.proposta_objetos) && card.proposta_objetos.length
      ? card.proposta_objetos
      : [{ nome: '', link: '' }],
    agenda_tipo: card.agenda_tipo ?? '',
    agenda_modalidade: card.agenda_modalidade ?? '',
    agenda_inicio: toDateTimeLocalValue(card.agenda_inicio),
    agenda_fim: toDateTimeLocalValue(card.agenda_fim),
    agenda_evento_nome: card.agenda_evento_nome ?? '',
    agenda_invites: Array.isArray(card.agenda_invites) && card.agenda_invites.length
      ? card.agenda_invites
      : [''],
    gravacao_conteudo_gravado: card.gravacao_conteudo_gravado ?? '',
    gravacao_data: toDateTimeLocalValue(card.gravacao_data),
    gravacao_link_arquivo: card.gravacao_link_arquivo ?? '',
    gravacao_material_apoio_link: card.gravacao_material_apoio_link ?? '',
    gravacao_justificativa: card.gravacao_justificativa ?? '',
    publicacao_data: toDateTimeLocalValue(card.publicacao_data),
    publicacao_link: card.publicacao_link ?? '',
  };
}

// ── Combobox de professor com busca ─────────────────────────
function ProfCombobox({ professores, value, onChange }) {
  const [busca, setBusca]   = useState('');
  const [aberto, setAberto] = useState(false);
  const wrapRef             = useRef(null);
  const inputRef            = useRef(null);

  const selecionado = professores.find(p => p.id === value) ?? null;

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return professores;
    return professores.filter(p =>
      p.nome.toLowerCase().includes(t) ||
      (p.area ?? '').toLowerCase().includes(t)
    );
  }, [professores, busca]);

  function selecionar(prof) {
    onChange(prof);
    setBusca('');
    setAberto(false);
  }

  function limpar(e) {
    e.stopPropagation();
    onChange(null);
    setBusca('');
    setAberto(false);
  }

  // Fecha ao clicar fora
  useEffect(() => {
    function onDown(e) {
      if (!wrapRef.current?.contains(e.target)) setAberto(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  return (
    <div ref={wrapRef} className="prof-combo-wrap">
      {/* Trigger / campo de busca */}
      <div
        className={`prof-combo-trigger ${aberto ? 'open' : ''}`}
        onClick={() => { setAberto(true); setTimeout(() => inputRef.current?.focus(), 10); }}
      >
        {aberto ? (
          <input
            ref={inputRef}
            className="prof-combo-search"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar professor..."
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className={selecionado ? 'prof-combo-selected' : 'prof-combo-placeholder'}>
            {selecionado ? selecionado.nome : 'Selecione...'}
          </span>
        )}
        {selecionado && !aberto && (
          <button type="button" className="prof-combo-clear" onClick={limpar}>✕</button>
        )}
        <span className="prof-combo-caret">{aberto ? '▲' : '▼'}</span>
      </div>

      {/* Dropdown */}
      {aberto && (
        <div className="prof-combo-dropdown">
          {filtrados.length === 0 && (
            <div className="prof-combo-empty">Nenhum professor encontrado</div>
          )}
          {filtrados.map(p => (
            <div
              key={p.id}
              className={`prof-combo-item ${p.id === value ? 'active' : ''}`}
              onMouseDown={e => { e.preventDefault(); selecionar(p); }}
            >
              <span className="prof-combo-item-nome">{p.nome}</span>
              {p.area && <span className="prof-combo-item-area">{p.area}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Modal principal ─────────────────────────────────────────
// Converte string vazia → null para campos numéricos
function num(v) { const n = parseFloat(v); return isNaN(n) ? null : n; }
function int(v) { const n = parseInt(v, 10); return isNaN(n) ? null : n; }
function blankToNull(v) { return v === '' ? null : v; }
function toDateTimeLocalValue(v) {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function dateTimeLocalToIso(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function CardModal({ card, onSave, onClose, saving = false, onMoveCard }) {
  const { profile } = useAuth();
  const [form, setForm]               = useState(() => formFromCard(card));
  const [adminPhaseId, setAdminPhaseId] = useState(card?.phase_id ?? 'aulas-solicitadas');
  const [professores, setProfessores] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [erro, setErro]               = useState(null);

  useEffect(() => {
    setAdminPhaseId(card?.phase_id ?? 'aulas-solicitadas');
  }, [card?.id, card?.phase_id]);

  // Carrega lista completa (com campos de remuneração)
  useEffect(() => {
    supabase
      .from('professores')
      .select('id, nome, area, valor_hora_video, valor_pag_teoria, valor_questao_com, valor_questao_in')
      .eq('ativo', true)
      .order('nome')
      .then(({ data }) => setProfessores(data ?? []));
  }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const selectedProf = useMemo(
    () => professores.find(p => p.id === form.professor_id) ?? null,
    [professores, form.professor_id]
  );

  function handleProfSelect(prof) {
    setForm(f => ({
      ...f,
      professor_id: prof?.id ?? '',
      disciplina:   f.disciplina || prof?.area || '',
    }));
  }

  const isVideo    = form.tipo_solicitacao === 'Vídeo';
  const isMaterial = form.tipo_solicitacao === 'Material Escrito';
  const isVideoCard = isVideo || card?.tipo_producao === 'Video' || card?.tipo === 'Video';
  const isMaterialCard = isMaterial || card?.tipo_producao === 'Material' || card?.tipo === 'Material';
  const isAdmin = profile?.perfil === 'admin';
  const phaseForUI = isAdmin ? adminPhaseId : card?.phase_id;
  const isSolicitacaoAprovada = phaseForUI === 'solicitacoes-aprovadas';
  const isPropostaEnviada = phaseForUI === 'propostas-enviadas';
  const isAgendamento = phaseForUI === 'agendamento';
  const isAulasGravacoesPrevistas = phaseForUI === 'aulas-gravacoes-previstas';
  const isVideosEditar = phaseForUI === 'videos-editar';
  const isPublicadoPlataforma = phaseForUI === 'publicado-plataforma';
  const isHomeStudio = form.agenda_tipo === 'Home Studio';
  const isEstudiosDc = form.agenda_tipo === 'Estúdios DC';
  const conteudoNaoGravado = form.gravacao_conteudo_gravado === 'nao';
  const agendamentoResumo = [
    { label: 'Professor', value: selectedProf?.nome ?? card?.professor_nome ?? '—' },
    { label: 'Disciplina', value: form.disciplina || '—' },
    { label: 'Assunto', value: form.assunto || '—' },
    { label: 'Tipo de solicitação', value: form.tipo_solicitacao || '—' },
    { label: 'Prazo de envio', value: form.prazo || '—' },
    { label: 'Concurso', value: form.concurso || '—' },
  ];

  function setObjeto(index, field, value) {
    setForm(f => ({
      ...f,
      proposta_objetos: f.proposta_objetos.map((obj, i) => (
        i === index ? { ...obj, [field]: value } : obj
      )),
    }));
  }

  function addObjeto() {
    setForm(f => ({
      ...f,
      proposta_objetos: [...f.proposta_objetos, { nome: '', link: '' }],
    }));
  }

  function removeObjeto(index) {
    setForm(f => ({
      ...f,
      proposta_objetos: f.proposta_objetos.filter((_, i) => i !== index),
    }));
  }

  function setInvite(index, value) {
    setForm(f => ({
      ...f,
      agenda_invites: f.agenda_invites.map((email, i) => (i === index ? value : email)),
    }));
  }

  function addInvite() {
    setForm(f => ({ ...f, agenda_invites: [...f.agenda_invites, ''] }));
  }

  function removeInvite(index) {
    setForm(f => ({
      ...f,
      agenda_invites: f.agenda_invites.filter((_, i) => i !== index),
    }));
  }

  const initialFields = (
    <>
      <div className="form-row">
        <label>Solicitante</label>
        <input type="text" value={profile?.name ?? ''} readOnly className="input-readonly" />
      </div>

      <div className="form-row-2">
        <div className="form-row">
          <label>Centro de Custo *</label>
          <select value={form.centro_custo} onChange={set('centro_custo')} required>
            {CENTROS_CUSTO.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>Tipo de Solicitação *</label>
          <select value={form.tipo_solicitacao} onChange={set('tipo_solicitacao')} required>
            <option value="">Selecione...</option>
            {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="form-row">
        <label>Professor *</label>
        <ProfCombobox
          professores={professores}
          value={form.professor_id}
          onChange={handleProfSelect}
        />
      </div>

      <div className="form-row-2">
        <div className="form-row">
          <label>Disciplina *</label>
          <input type="text" value={form.disciplina} onChange={set('disciplina')}
            placeholder="Ex: Direito Constitucional" required />
        </div>
        <div className="form-row">
          <label>Assunto</label>
          <input type="text" value={form.assunto} onChange={set('assunto')}
            placeholder="Ex: Princípios fundamentais" />
        </div>
      </div>

      <div className="form-row">
        <label>Concurso</label>
        <input type="text" value={form.concurso} onChange={set('concurso')}
          placeholder="Ex: PMSP 2025" />
      </div>

      <div className="form-row-2">
        <div className="form-row">
          <label>Prazo para Envio</label>
          <input type="date" value={form.prazo} onChange={set('prazo')} />
        </div>
        <div className="form-row">
          <label>Data da Prova</label>
          <input type="date" value={form.data_prova} onChange={set('data_prova')} />
        </div>
      </div>

      {isVideo && (
        <>
          <div className="form-section-label">Duração da gravação</div>
          <div className="form-row-2">
            <div className="form-row">
              <label>Horas</label>
              <input type="number" value={form.tempo_horas} onChange={set('tempo_horas')}
                placeholder="0" min="0" step="1" />
            </div>
            <div className="form-row">
              <label>Minutos</label>
              <input type="number" value={form.tempo_minutos} onChange={set('tempo_minutos')}
                placeholder="0" min="0" max="59" step="1" />
            </div>
          </div>
        </>
      )}

      {isMaterial && (
        <>
          <div className="form-section-label">Quantidades</div>
          <div className="form-row-3">
            <div className="form-row">
              <label>Teoria</label>
              <input type="number" value={form.pag_teoria} onChange={set('pag_teoria')}
                placeholder="0" min="0" />
            </div>
            <div className="form-row">
              <label>Questões comentadas</label>
              <input type="number" value={form.pag_questoes_com} onChange={set('pag_questoes_com')}
                placeholder="0" min="0" />
            </div>
            <div className="form-row">
              <label>Questões inéditas</label>
              <input type="number" value={form.pag_questoes_in} onChange={set('pag_questoes_in')}
                placeholder="0" min="0" />
            </div>
          </div>
        </>
      )}
    </>
  );

  // Cálculo reativo do custo previsto
  const valorPrevisto = useMemo(() => {
    if (!selectedProf) return null;

    if (isVideo) {
      const horas = (parseFloat(form.tempo_horas) || 0) + (parseFloat(form.tempo_minutos) || 0) / 60;
      const taxa  = parseFloat(selectedProf.valor_hora_video) || 0;
      return horas > 0 && taxa > 0 ? horas * taxa : null;
    }

    if (isMaterial) {
      const teoria = (parseFloat(form.pag_teoria)       || 0) * (parseFloat(selectedProf.valor_pag_teoria)  || 0);
      const qcom   = (parseFloat(form.pag_questoes_com) || 0) * (parseFloat(selectedProf.valor_questao_com) || 0);
      const qin    = (parseFloat(form.pag_questoes_in)  || 0) * (parseFloat(selectedProf.valor_questao_in)  || 0);
      const total  = teoria + qcom + qin;
      return total > 0 ? total : null;
    }

    return null;
  }, [selectedProf, isVideo, isMaterial, form.tempo_horas, form.tempo_minutos,
      form.pag_teoria, form.pag_questoes_com, form.pag_questoes_in]);

  const proposalText = useMemo(() => {
    const tempoSolicitado = isVideo
      ? `${parseFloat(form.tempo_horas) || 0}h${String(parseFloat(form.tempo_minutos) || 0).padStart(2, '0')}min`
      : null;
    const quantidadesSolicitadas = isMaterial
      ? [
        form.pag_teoria ? `${form.pag_teoria} teoria` : null,
        form.pag_questoes_com ? `${form.pag_questoes_com} questões comentadas` : null,
        form.pag_questoes_in ? `${form.pag_questoes_in} questões inéditas` : null,
      ].filter(Boolean).join(', ')
      : null;

    return [
      `Olá, ${selectedProf?.nome ?? card?.professor_nome ?? 'professor(a)'}.`,
      `Temos uma proposta de produção para a disciplina de [${form.disciplina || '—'}]${form.assunto ? ` - Assunto [${form.assunto}.]` : ''}`,
      form.concurso ? `Concurso: ${form.concurso}` : null,
      form.tipo_solicitacao ? `Tipo: ${form.tipo_solicitacao}` : null,
      tempoSolicitado ? `Tempo Solicitado: ${tempoSolicitado}` : null,
      quantidadesSolicitadas ? `Quantidade Solicitada: ${quantidadesSolicitadas}` : null,
      form.prazo ? `Prazo de entrega: ${form.prazo}` : null,
      valorPrevisto ? `Valor previsto: ${brl(valorPrevisto)}` : null,
      '',
      'Aprove ou recuse a solicitação no link abaixo',
      '[link da proposta]',
    ].filter(Boolean).join('\n');
  }, [card?.professor_nome, form.assunto, form.concurso, form.disciplina, form.prazo,
      form.pag_questoes_com, form.pag_questoes_in, form.pag_teoria, form.tempo_horas,
      form.tempo_minutos, form.tipo_solicitacao, isMaterial, isVideo, selectedProf?.nome,
      valorPrevisto]);

  async function copyProposal() {
    await navigator.clipboard.writeText(proposalText);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.tipo_solicitacao || !form.professor_id) return;
    setErro(null);
    setLoading(true);
    try {
      const horas   = parseFloat(form.tempo_horas)   || 0;
      const minutos = parseFloat(form.tempo_minutos) || 0;
      const tempo_gravacao = (horas || minutos)
        ? parseFloat((horas + minutos / 60).toFixed(4))
        : null;

      const tipoInterno = tipoProducao(form.tipo_solicitacao);
      const payload = {
        tipo_solicitacao: form.tipo_solicitacao,
        centro_custo: form.centro_custo,
        professor_id: form.professor_id,
        professor_nome: selectedProf?.nome ?? null,
        disciplina: form.disciplina,
        assunto: blankToNull(form.assunto),
        concurso: blankToNull(form.concurso),
        prazo: blankToNull(form.prazo),
        data_prova: blankToNull(form.data_prova),
        tempo_gravacao: isVideo ? tempo_gravacao : null,
        pag_teoria: isMaterial ? int(form.pag_teoria) : null,
        pag_questoes_com: isMaterial ? int(form.pag_questoes_com) : null,
        pag_questoes_in: isMaterial ? int(form.pag_questoes_in) : null,
        observacoes: blankToNull(form.observacoes),
        proposta_diretrizes: blankToNull(form.proposta_diretrizes),
        proposta_prazo_aceite: blankToNull(form.proposta_prazo_aceite),
        proposta_status: blankToNull(form.proposta_status),
        proposta_motivo: blankToNull(form.proposta_motivo),
        proposta_objetos: form.proposta_objetos
          .map(obj => ({ nome: obj.nome?.trim() ?? '', link: obj.link?.trim() ?? '' }))
          .filter(obj => obj.nome || obj.link),
        agenda_tipo: blankToNull(form.agenda_tipo),
        agenda_modalidade: blankToNull(form.agenda_modalidade),
        agenda_inicio: dateTimeLocalToIso(form.agenda_inicio),
        agenda_fim: dateTimeLocalToIso(form.agenda_fim),
        agenda_evento_nome: blankToNull(form.agenda_evento_nome),
        agenda_invites: form.agenda_invites
          .map(email => email.trim())
          .filter(Boolean),
        gravacao_conteudo_gravado: blankToNull(form.gravacao_conteudo_gravado),
        gravacao_data: dateTimeLocalToIso(form.gravacao_data),
        gravacao_link_arquivo: blankToNull(form.gravacao_link_arquivo),
        gravacao_material_apoio_link: blankToNull(form.gravacao_material_apoio_link),
        gravacao_justificativa: blankToNull(form.gravacao_justificativa),
        publicacao_data: dateTimeLocalToIso(form.publicacao_data),
        publicacao_link: blankToNull(form.publicacao_link),
        tipo_producao: tipoInterno,
        tipo: tipoInterno,
        solicitante: profile?.name ?? '',
        title: `${form.tipo_solicitacao} - ${form.assunto || form.disciplina}`,
      };

      if (!card) {
        payload.valor_previsto = num(valorPrevisto);
      }

      if (card && isAdmin && adminPhaseId) {
        payload.phase_id = adminPhaseId;
      }

      await onSave(payload);
    } catch (error) {
      setErro(error?.message ?? 'Não foi possível salvar a solicitação.');
    } finally {
      setLoading(false);
    }
  }

  function buildMoveFields() {
    const horas = parseFloat(form.tempo_horas) || 0;
    const minutos = parseFloat(form.tempo_minutos) || 0;
    const tempo_gravacao = (horas || minutos)
      ? parseFloat((horas + minutos / 60).toFixed(4))
      : null;

    return {
      disciplina: form.disciplina,
      assunto: blankToNull(form.assunto),
      concurso: blankToNull(form.concurso),
      prazo: blankToNull(form.prazo),
      data_prova: blankToNull(form.data_prova),
      tempo_gravacao: isVideoCard ? tempo_gravacao : null,
      pag_teoria: isMaterialCard ? int(form.pag_teoria) : null,
      pag_questoes_com: isMaterialCard ? int(form.pag_questoes_com) : null,
      pag_questoes_in: isMaterialCard ? int(form.pag_questoes_in) : null,
      proposta_diretrizes: blankToNull(form.proposta_diretrizes),
      proposta_prazo_aceite: blankToNull(form.proposta_prazo_aceite),
      proposta_status: blankToNull(form.proposta_status),
      proposta_motivo: blankToNull(form.proposta_motivo),
      proposta_objetos: form.proposta_objetos
        .map(obj => ({ nome: obj.nome?.trim() ?? '', link: obj.link?.trim() ?? '' }))
        .filter(obj => obj.nome || obj.link),
      agenda_tipo: blankToNull(form.agenda_tipo),
      agenda_modalidade: blankToNull(form.agenda_modalidade),
      agenda_inicio: dateTimeLocalToIso(form.agenda_inicio),
      agenda_fim: dateTimeLocalToIso(form.agenda_fim),
      agenda_evento_nome: blankToNull(form.agenda_evento_nome),
      agenda_invites: form.agenda_invites
        .map(email => email.trim())
        .filter(Boolean),
      gravacao_conteudo_gravado: blankToNull(form.gravacao_conteudo_gravado),
      gravacao_data: dateTimeLocalToIso(form.gravacao_data),
      gravacao_link_arquivo: blankToNull(form.gravacao_link_arquivo),
      gravacao_material_apoio_link: blankToNull(form.gravacao_material_apoio_link),
      gravacao_justificativa: blankToNull(form.gravacao_justificativa),
      publicacao_data: dateTimeLocalToIso(form.publicacao_data),
      publicacao_link: blankToNull(form.publicacao_link),
    };
  }

  function validateMove(cardToMove, move) {
    if (cardToMove?.phase_id === 'agendamento' && move.phaseId === 'aulas-gravacoes-previstas') {
      if (!form.agenda_tipo || !form.agenda_modalidade || !form.agenda_inicio || !form.agenda_fim || !form.agenda_evento_nome) {
        window.alert('Preencha agenda, modalidade, início/fim e nome do evento antes de mover.');
        return false;
      }
      if (!form.agenda_invites.map(email => email.trim()).filter(Boolean).length) {
        window.alert('Informe pelo menos um e-mail para invite antes de mover.');
        return false;
      }
    }

    if (cardToMove?.phase_id === 'aulas-gravacoes-previstas') {
      if (!form.gravacao_conteudo_gravado) {
        window.alert('Informe se o conteúdo foi gravado antes de mover.');
        return false;
      }
      if (form.gravacao_conteudo_gravado === 'nao' && !form.gravacao_justificativa?.trim()) {
        window.alert('Informe a justificativa do conteúdo não gravado.');
        return false;
      }
      if (form.gravacao_conteudo_gravado === 'sim' && !form.gravacao_data) {
        window.alert('Informe a data da gravação antes de mover.');
        return false;
      }
    }

    if (move.phaseId === 'remuneracao-professor') {
      if (isVideoCard && !((parseFloat(form.tempo_horas) || 0) + (parseFloat(form.tempo_minutos) || 0))) {
        window.alert('No fluxo de vídeo, confirme o tempo gravado antes de enviar ao Financeiro.');
        return false;
      }
      if (isMaterialCard) {
        const hasMissing = [form.pag_teoria, form.pag_questoes_com, form.pag_questoes_in].some(v => v === '');
        if (hasMissing) {
          window.alert('No fluxo de material, confirme teoria, questões comentadas e inéditas antes de enviar ao Financeiro.');
          return false;
        }
      }
    }

    if (cardToMove?.phase_id === 'videos-editar' && move.phaseId === 'publicado-plataforma') {
      if (!form.publicacao_data || !form.publicacao_link?.trim()) {
        window.alert('Informe data e link da publicação antes de avançar para "Publicado na Plataforma".');
        return false;
      }
    }

    return true;
  }

  function handleMove(cardToMove, move) {
    if (!validateMove(cardToMove, move)) return;
    onMoveCard?.(cardToMove, move, buildMoveFields());
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal modal-lg ${isSolicitacaoAprovada ? 'modal-phase' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{card ? `Editar #${card.card_number}` : 'Nova Solicitação'}</h2>
          </div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {erro && <div className="form-error">{erro}</div>}

          {card && (
            <section className="phase-current-panel">
              <h3>Controle de vencimento</h3>
              <p className="phase-caption">Você pode ajustar os vencimentos deste card a qualquer momento, independente da fase atual.</p>
              <div className="form-row-2">
                <div className="form-row">
                  <label>Prazo para envio</label>
                  <input type="date" value={form.prazo} onChange={set('prazo')} />
                </div>
                <div className="form-row">
                  <label>Data da prova</label>
                  <input type="date" value={form.data_prova} onChange={set('data_prova')} />
                </div>
              </div>
              {isAdmin && (
                <div className="form-row" style={{ marginTop: 12 }}>
                  <label>Fase do card (admin)</label>
                  <select value={adminPhaseId} onChange={e => setAdminPhaseId(e.target.value)}>
                    {PHASES.map(phase => (
                      <option key={phase.id} value={phase.id}>{phase.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </section>
          )}

          {(isAdmin || (!isSolicitacaoAprovada && !isAgendamento && !isAulasGravacoesPrevistas)) && initialFields}

          {(isAdmin || (!isSolicitacaoAprovada && !isAgendamento && !isAulasGravacoesPrevistas)) && (isVideo || isMaterial) && (
            <div className={`custo-previsto ${valorPrevisto ? 'custo-previsto--ok' : 'custo-previsto--vazio'}`}>
              <div className="custo-previsto-label">Custo previsto</div>
              <div className="custo-previsto-valor">
                {valorPrevisto
                  ? brl(valorPrevisto)
                  : selectedProf ? 'Preencha as quantidades acima' : 'Selecione o professor'}
              </div>
              {valorPrevisto && selectedProf && (
                <div className="custo-previsto-detalhe">
                  {isVideo && selectedProf.valor_hora_video &&
                    `${parseFloat(form.tempo_horas)||0}h${String(parseFloat(form.tempo_minutos)||0).padStart(2,'0')}min × ${brl(selectedProf.valor_hora_video)}/h`}
                  {isMaterial && [
                    form.pag_teoria       && selectedProf.valor_pag_teoria  && `${form.pag_teoria} teoria × ${brl(selectedProf.valor_pag_teoria)}`,
                    form.pag_questoes_com && selectedProf.valor_questao_com && `${form.pag_questoes_com} q.com. × ${brl(selectedProf.valor_questao_com)}`,
                    form.pag_questoes_in  && selectedProf.valor_questao_in  && `${form.pag_questoes_in} q.inéd. × ${brl(selectedProf.valor_questao_in)}`,
                  ].filter(Boolean).join('  +  ')}
                </div>
              )}
            </div>
          )}

          {(isAdmin || (!isSolicitacaoAprovada && !isAgendamento && !isAulasGravacoesPrevistas)) && (isVideo || isMaterial) && (
            <BudgetImpact
              prazo={form.prazo}
              valorPrevisto={valorPrevisto}
              cardId={card?.id}
              centroCusto={form.centro_custo}
            />
          )}

          {(isAdmin || (!isSolicitacaoAprovada && !isAgendamento && !isAulasGravacoesPrevistas)) && (
            <div className="form-row">
              <label>Observações</label>
              <textarea value={form.observacoes} onChange={set('observacoes')}
                placeholder="Informações adicionais para o gestor..." rows={2} />
            </div>
          )}

          {isPropostaEnviada && (
            <div className="proposal-status-box">
              <span>Status da proposta</span>
              <strong>{form.proposta_status || 'Proposta enviada'}</strong>
              <small>{form.proposta_prazo_aceite ? `Vence em ${form.proposta_prazo_aceite}` : 'Sem prazo de aceite informado'}</small>
            </div>
          )}

          {isPropostaEnviada && (
            <>
              <div className="form-row-2">
                <div className="form-row">
                  <label>Status da proposta</label>
                  <select value={form.proposta_status} onChange={set('proposta_status')}>
                    <option value="Proposta enviada">Proposta enviada</option>
                    <option value="Expirada">Expirada</option>
                    <option value="Recusada">Recusada</option>
                    <option value="Aceita">Aceita</option>
                  </select>
                </div>
                <div className="form-row">
                  <label>Prazo para Aceite da Proposta</label>
                  <input type="date" value={form.proposta_prazo_aceite} onChange={set('proposta_prazo_aceite')} />
                </div>
              </div>
              <div className="form-row">
                <label>Motivo / observação da proposta</label>
                <textarea
                  rows={2}
                  value={form.proposta_motivo}
                  onChange={set('proposta_motivo')}
                  placeholder="Ex: proposta recusada pelo professor por conflito de agenda."
                />
              </div>
            </>
          )}

          {isSolicitacaoAprovada ? (
            <div className="phase-workspace phase-workspace--approved">
              <aside className="phase-history-panel">
                <h3>Solicitação original</h3>
                <details open>
                  <summary>Resumo</summary>
                  <div className="phase-original-fields">
                    {initialFields}
                    {(isVideo || isMaterial) && (
                      <div className={`custo-previsto ${valorPrevisto ? 'custo-previsto--ok' : 'custo-previsto--vazio'}`}>
                        <div className="custo-previsto-label">Custo previsto</div>
                        <div className="custo-previsto-valor">
                          {valorPrevisto ? brl(valorPrevisto) : 'Sem custo calculado'}
                        </div>
                      </div>
                    )}
                    {(isVideo || isMaterial) && (
                      <BudgetImpact
                        prazo={form.prazo}
                        valorPrevisto={valorPrevisto}
                        cardId={card?.id}
                        centroCusto={form.centro_custo}
                      />
                    )}
                    <div className="form-row">
                      <label>Observações</label>
                      <textarea value={form.observacoes} onChange={set('observacoes')} rows={2} />
                    </div>
                  </div>
                </details>
                <details>
                  <summary>Fases anteriores</summary>
                  <p className="phase-history-empty">Histórico detalhado será exibido aqui conforme o fluxo for evoluindo.</p>
                </details>
              </aside>

              <div className="phase-main-stack">
                <section className="phase-current-panel">
                  <div className="proposal-title-row">
                    <h3>Proposta ao Professor</h3>
                    <button type="button" className="btn-secondary" onClick={copyProposal}>Copiar proposta</button>
                  </div>
                  <div className="form-row">
                    <label>Diretrizes</label>
                    <textarea
                      value={form.proposta_diretrizes}
                      onChange={set('proposta_diretrizes')}
                      placeholder="Descreva escopo, critérios, formato esperado e orientações para o professor..."
                      rows={7}
                    />
                  </div>

                  <div className="proposal-objects-head">
                    <span>Link e Nome dos Objetos</span>
                    <button type="button" className="btn-secondary" onClick={addObjeto}>+ Objeto</button>
                  </div>

                  {form.proposta_objetos.map((obj, index) => (
                    <div className="proposal-object-row" key={index}>
                      <input
                        type="text"
                        value={obj.nome}
                        onChange={e => setObjeto(index, 'nome', e.target.value)}
                        placeholder="Nome do objeto"
                      />
                      <input
                        type="text"
                        value={obj.link}
                        onChange={e => setObjeto(index, 'link', e.target.value)}
                        placeholder="https://..."
                      />
                      {form.proposta_objetos.length > 1 && (
                        <button type="button" className="btn-archive" onClick={() => removeObjeto(index)}>Remover</button>
                      )}
                    </div>
                  ))}

                  <div className="form-row">
                    <label>Prazo para Aceite da Proposta</label>
                    <input type="date" value={form.proposta_prazo_aceite} onChange={set('proposta_prazo_aceite')} />
                  </div>

                  <div className="form-row">
                    <label>Texto para WhatsApp</label>
                    <textarea value={proposalText} readOnly rows={7} className="input-readonly" />
                  </div>
                </section>

                <section className="phase-move-side">
                  <CardMovePanel card={card} onMove={handleMove} />
                </section>
              </div>
            </div>
          ) : isAgendamento ? (
            <div className="phase-single-flow">
              <section className="phase-current-panel">
                <h3>Contexto da solicitação</h3>
                <div className="phase-context-grid">
                  {agendamentoResumo.map(item => (
                    <div key={item.label} className="phase-context-item">
                      <strong>{item.label}</strong>
                      <span>{item.value}</span>
                    </div>
                  ))}
                </div>
              </section>
              <section className="phase-current-panel">
                <h3>Dados de agendamento</h3>
                <p className="phase-caption">Preencha os dados para criar o evento e enviar os invites da operação.</p>
                <div className="form-row-2">
                  <div className="form-row">
                    <label>Escolha uma agenda</label>
                    <select value={form.agenda_tipo} onChange={set('agenda_tipo')}>
                      <option value="">Selecione...</option>
                      <option value="Home Studio">Home Studio</option>
                      <option value="Estúdios DC">Estúdios DC</option>
                    </select>
                  </div>
                  <div className="form-row">
                    <label>Como será a aula</label>
                    <select value={form.agenda_modalidade} onChange={set('agenda_modalidade')}>
                      <option value="">Selecione...</option>
                      <option value="Gravação">Gravação</option>
                      <option value="Ao Vivo">Ao Vivo</option>
                    </select>
                  </div>
                </div>
                <div className="form-row-2">
                  <div className="form-row">
                    <label>Data e horário de início</label>
                    <input type="datetime-local" value={form.agenda_inicio} onChange={set('agenda_inicio')} />
                  </div>
                  <div className="form-row">
                    <label>Data e horário de término</label>
                    <input type="datetime-local" value={form.agenda_fim} onChange={set('agenda_fim')} />
                  </div>
                </div>
                <div className="form-row">
                  <label>Nome do evento</label>
                  <input
                    type="text"
                    value={form.agenda_evento_nome}
                    onChange={set('agenda_evento_nome')}
                    placeholder="Ex: Gravação - Direito Constitucional - Erick"
                  />
                </div>
                <div className="proposal-objects-head">
                  <span>E-mails para receber invite</span>
                  <button type="button" className="btn-secondary" onClick={addInvite}>+ E-mail</button>
                </div>
                {form.agenda_invites.map((email, index) => (
                  <div className="proposal-object-row" key={`invite-${index}`}>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setInvite(index, e.target.value)}
                      placeholder="nome@empresa.com"
                    />
                    {form.agenda_invites.length > 1 && (
                      <button type="button" className="btn-archive" onClick={() => removeInvite(index)}>Remover</button>
                    )}
                  </div>
                ))}
              </section>
              <section className="phase-move-side">
                <CardMovePanel card={card} onMove={handleMove} />
              </section>
            </div>
          ) : isAulasGravacoesPrevistas ? (
            <div className="phase-single-flow">
              <section className="phase-current-panel">
                <h3>Aulas e Gravações Previstas</h3>
                <p className="phase-caption">
                  Registro operacional da gravação após o agendamento. Os campos mudam conforme a agenda selecionada.
                </p>
                <div className="phase-context-grid">
                  <div className="phase-context-item">
                    <strong>Agenda</strong>
                    <span>{form.agenda_tipo || 'Não definida no agendamento'}</span>
                  </div>
                  <div className="phase-context-item">
                    <strong>Modalidade</strong>
                    <span>{form.agenda_modalidade || '—'}</span>
                  </div>
                </div>
                <div className="form-row-2">
                  <div className="form-row">
                    <label>Conteúdo gravado?</label>
                    <select value={form.gravacao_conteudo_gravado} onChange={set('gravacao_conteudo_gravado')}>
                      <option value="">Selecione...</option>
                      <option value="sim">Sim</option>
                      <option value="nao">Não</option>
                    </select>
                  </div>
                  <div className="form-row">
                    <label>Data da gravação</label>
                    <input type="datetime-local" value={form.gravacao_data} onChange={set('gravacao_data')} />
                  </div>
                </div>

                {isHomeStudio && !conteudoNaoGravado && (
                  <>
                    <p className="phase-caption">Para Home Studio, registrar envio do professor e materiais recebidos.</p>
                    <div className="form-row">
                      <label>Link de acesso ao arquivo para download</label>
                      <input
                        type="text"
                        value={form.gravacao_link_arquivo}
                        onChange={set('gravacao_link_arquivo')}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="form-row">
                      <label>Material de apoio (link)</label>
                      <input
                        type="text"
                        value={form.gravacao_material_apoio_link}
                        onChange={set('gravacao_material_apoio_link')}
                        placeholder="https://..."
                      />
                    </div>
                  </>
                )}

                {isEstudiosDc && !conteudoNaoGravado && (
                  <p className="phase-caption">Para Estúdios DC, registrar confirmação do conteúdo e data da gravação.</p>
                )}

                {conteudoNaoGravado && (
                  <div className="form-row">
                    <label>Justificativa (conteúdo não gravado)</label>
                    <textarea
                      rows={4}
                      value={form.gravacao_justificativa}
                      onChange={set('gravacao_justificativa')}
                      placeholder="Informe o motivo do conteúdo não ter sido gravado."
                    />
                  </div>
                )}
              </section>
              <section className="phase-move-side">
                <CardMovePanel card={card} onMove={handleMove} />
              </section>
            </div>
          ) : isVideosEditar ? (
            <div className="phase-single-flow">
              <section className="phase-current-panel">
                <h3>Edição de Vídeo</h3>
                <p className="phase-caption">Confirme o tempo final gravado e os dados da publicação para seguir para financeiro.</p>
                <div className="form-row-2">
                  <div className="form-row">
                    <label>Horas gravadas finais</label>
                    <input type="number" value={form.tempo_horas} onChange={set('tempo_horas')} min="0" step="1" />
                  </div>
                  <div className="form-row">
                    <label>Minutos gravados finais</label>
                    <input type="number" value={form.tempo_minutos} onChange={set('tempo_minutos')} min="0" max="59" step="1" />
                  </div>
                </div>
                <div className="form-row-2">
                  <div className="form-row">
                    <label>Data da publicação</label>
                    <input type="datetime-local" value={form.publicacao_data} onChange={set('publicacao_data')} />
                  </div>
                  <div className="form-row">
                    <label>Link da publicação</label>
                    <input type="text" value={form.publicacao_link} onChange={set('publicacao_link')} placeholder="https://..." />
                  </div>
                </div>
              </section>
              <section className="phase-move-side">
                <CardMovePanel card={card} onMove={handleMove} />
              </section>
            </div>
          ) : isPublicadoPlataforma ? (
            <div className="phase-single-flow">
              <section className="phase-current-panel">
                <h3>Publicado na Plataforma</h3>
                <p className="phase-caption">Revise os dados finais para envio ao Financeiro.</p>
                <div className="phase-context-grid">
                  <div className="phase-context-item">
                    <strong>Data da publicação</strong>
                    <span>{form.publicacao_data || 'Não informada'}</span>
                  </div>
                  <div className="phase-context-item">
                    <strong>Link da publicação</strong>
                    <span>{form.publicacao_link || 'Não informado'}</span>
                  </div>
                </div>
              </section>
              <section className="phase-move-side">
                <CardMovePanel card={card} onMove={handleMove} />
              </section>
            </div>
          ) : (
            <CardMovePanel card={card} onMove={handleMove} />
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading || saving}>
              {loading || saving ? 'Salvando...' : card ? 'Salvar alterações' : 'Criar solicitação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
