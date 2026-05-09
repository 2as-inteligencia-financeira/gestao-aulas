import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ALTO-03: CORS restrito ao domínio do gestao-aulas
const ALLOWED_ORIGINS = [
  'https://aulas.2asfinancas.com',
  'http://localhost:5173',
  'http://localhost:5174',
];

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowed || 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

Deno.serve(async (req) => {
  const headers = corsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Não autorizado');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey     = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Valida o JWT do usuário que chamou a função
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !caller) throw new Error('Token inválido');

    // Confere se o chamador é admin
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await adminClient
      .from('profiles')
      .select('perfil')
      .eq('id', caller.id)
      .single();

    if (profile?.perfil !== 'admin') throw new Error('Permissão negada');

    const { name, email, password, perfil } = await req.json();
    if (!email || !password || !name) throw new Error('Campos obrigatórios: name, email, password');

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, perfil: perfil ?? 'operador' },
    });

    if (error) throw error;

    return new Response(JSON.stringify({ id: data.user?.id }), {
      headers: { ...headers, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    // BAIXO-05: não expõe detalhes internos ao cliente
    const safe = err instanceof Error && [
      'Token inválido', 'Não autorizado', 'Permissão negada',
      'Campos obrigatórios: name, email, password',
    ].includes(err.message)
      ? err.message
      : 'Erro ao processar a solicitação.';

    return new Response(JSON.stringify({ error: safe }), {
      headers: { ...headers, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
