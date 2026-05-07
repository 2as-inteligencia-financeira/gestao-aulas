import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPREADSHEET_ID = '16dLgqONuxIQU2xbN7_IHQ--HFyoJk7jTTZBFkfrXJLI';
const CADASTRO_GID   = '1448507810';

// ── JWT helper (Web Crypto — Deno nativo) ─────────────────────────────────────

function b64url(data: Uint8Array | string): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const bin   = Array.from(bytes, b => String.fromCharCode(b)).join('');
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function pemToDer(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const bin = atob(b64);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

async function googleAccessToken(): Promise<string> {
  const email      = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL') ?? '';
  const rawKey     = Deno.env.get('GOOGLE_PRIVATE_KEY') ?? '';
  const privateKey = rawKey.replace(/\\n/g, '\n');

  if (!email || !privateKey) throw new Error('Credenciais Google ausentes (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY)');

  const now = Math.floor(Date.now() / 1000);
  const header  = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss:   email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  };

  const sigInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(sigInput));
  const assertion = `${sigInput}.${b64url(new Uint8Array(sig))}`;

  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) throw new Error('Falha ao obter token Google: ' + (json.error_description ?? json.error ?? ''));
  return json.access_token;
}

// ── Google Sheets API ─────────────────────────────────────────────────────────

async function sheetsGet(path: string, token: string) {
  const res  = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? 'Erro Google Sheets API');
  return json;
}

async function getSheetTitle(spreadsheetId: string, gid: string, token: string): Promise<string> {
  const meta  = await sheetsGet(`${encodeURIComponent(spreadsheetId)}?fields=sheets.properties`, token);
  const sheet = meta.sheets?.find((s: any) => String(s.properties?.sheetId) === String(gid));
  return sheet?.properties?.title ?? '';
}

async function fetchSheetValues(spreadsheetId: string, gid: string, token: string): Promise<string[][]> {
  const title  = await getSheetTitle(spreadsheetId, gid, token);
  const range  = encodeURIComponent(`'${title.replace(/'/g, "''")}'!A:K`);
  const result = await sheetsGet(
    `${encodeURIComponent(spreadsheetId)}/values/${range}?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`,
    token,
  );
  return result.values ?? [];
}

// ── Mapeamento de colunas ─────────────────────────────────────────────────────

function norm(s: string) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
}

function findCol(headers: string[], ...labels: string[]): number {
  const targets = labels.map(norm);
  return headers.findIndex(h => targets.includes(norm(h)));
}

function numBR(v: string): number | null {
  if (!v) return null;
  const s = v.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim();
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function mapRow(headers: string[], row: string[]): Record<string, unknown> | null {
  const get = (col: number) => (col >= 0 ? (row[col] ?? '').trim() : '');

  // Mapeamento com nomes exatos da aba CADASTRO PROFESSOR (A–K)
  // A: PROFESSOR | B: EMAIL | C: FORMA DE PAGAMENTO | D: VALOR DA HORA AULA
  // E: PERIODO DO PAGAMENTO | F: % ASSINATURA | G: VALOR FORUM DE DUVIDAS
  // H: PRODUCAO (TEORIA) | I: PRODUCAO (QUESTOES) | J: PRODUCAO (QUESTOES INEDITAS) | K: FIXO
  const iNome   = findCol(headers,
    'Professor', 'PROFESSOR', 'Nome', 'Nome Completo', 'Nome do Professor');
  const iEmail  = findCol(headers,
    'Email', 'EMAIL', 'E-mail');
  const iPgto   = findCol(headers,
    'Forma de Pagamento', 'FORMA DE PAGAMENTO', 'Forma Pagamento');
  const iVhora  = findCol(headers,
    'Valor da Hora Aula', 'VALOR DA HORA AULA', 'Valor Hora Aula', 'Valor/Hora', 'Valor Hora');
  const iPeriodo = findCol(headers,
    'Periodo do Pagamento', 'PERIODO DO PAGAMENTO', 'Período do Pagamento');
  const iAssin  = findCol(headers,
    '% Assinatura', '% ASSINATURA', 'Assinatura');
  const iForum  = findCol(headers,
    'Valor Forum de Duvidas', 'VALOR FORUM DE DUVIDAS', 'Valor Fórum de Dúvidas', 'Forum');
  const iVteo   = findCol(headers,
    'Producao (Teoria)', 'PRODUCAO (TEORIA)', 'Produção (Teoria)', 'Teoria');
  const iVqcom  = findCol(headers,
    'Producao (Questoes)', 'PRODUCAO (QUESTOES)', 'Produção (Questões)', 'Questoes');
  const iVqin   = findCol(headers,
    'Producao (Questoes Ineditas)', 'PRODUCAO (QUESTOES INEDITAS)', 'Produção (Questões Inéditas)', 'Questoes Ineditas');
  const iFixo   = findCol(headers,
    'Fixo', 'FIXO');

  const nome = get(iNome);
  if (!nome) return null;

  return {
    nome,
    email:              get(iEmail)   || null,
    chave_pix:          get(iPgto)    || null,   // forma de pagamento / PIX
    valor_hora_video:   numBR(get(iVhora)),
    valor_pag_teoria:   numBR(get(iVteo)),
    valor_questao_com:  numBR(get(iVqcom)),
    valor_questao_in:   numBR(get(iVqin)),
    // campos extras para referência futura
    observacoes: [
      iPeriodo >= 0 && get(iPeriodo) ? `Período: ${get(iPeriodo)}` : '',
      iAssin   >= 0 && get(iAssin)   ? `Assinatura: ${get(iAssin)}` : '',
      iForum   >= 0 && get(iForum)   ? `Fórum: R$${get(iForum)}` : '',
      iFixo    >= 0 && get(iFixo)    ? `Fixo: R$${get(iFixo)}`   : '',
    ].filter(Boolean).join(' | ') || null,
  };
}

// ── Handler principal ─────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Valida chamador autenticado e admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Não autorizado');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey     = Deno.env.get('SUPABASE_ANON_KEY')!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !caller) throw new Error('Token inválido');

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await adminClient
      .from('profiles').select('perfil').eq('id', caller.id).single();
    if (profile?.perfil !== 'admin') throw new Error('Permissão negada — apenas admins podem sincronizar');

    // Busca dados da planilha
    const token  = await googleAccessToken();
    const rows   = await fetchSheetValues(SPREADSHEET_ID, CADASTRO_GID, token);

    if (rows.length < 2) throw new Error('Planilha vazia ou sem dados');

    const headers   = rows[0].map(h => h.trim());
    const dataRows  = rows.slice(1).filter(r => r.some(v => v?.trim()));
    const professores = dataRows.map(r => mapRow(headers, r)).filter(Boolean);

    if (professores.length === 0) throw new Error('Nenhum professor mapeado. Verifique os cabeçalhos da aba Cadastro.');

    // Upsert na tabela professores (match por nome)
    const { error: upsertErr } = await adminClient
      .from('professores')
      .upsert(professores, { onConflict: 'nome', ignoreDuplicates: false });

    if (upsertErr) throw upsertErr;

    return new Response(
      JSON.stringify({
        ok: true,
        sincronizados: professores.length,
        headers,   // retorna cabeçalhos para debug
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    );
  }
});
