import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verifica que quem chamou está autenticado e é admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Não autorizado');

    const supabaseUrl  = Deno.env.get('SUPABASE_URL')!;
    const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey      = Deno.env.get('SUPABASE_ANON_KEY')!;

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

    if (profile?.perfil !== 'admin') throw new Error('Permissão negada — apenas admins podem criar usuários');

    // Cria o novo usuário
    const { name, email, password, perfil } = await req.json();
    if (!email || !password || !name) throw new Error('Campos obrigatórios: name, email, password');

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,          // auto-confirma, sem precisar de e-mail
      user_metadata: { name, perfil: perfil ?? 'operador' },
    });

    if (error) throw error;

    return new Response(JSON.stringify({ id: data.user?.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
