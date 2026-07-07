import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface PlayerIn {
  id: string;
  name: string;
  position: string;
}

interface ScoutOut {
  playerId: string;
  gols: number;
  assistencias: number;
  desarmes: number;
  defesasDificeis: number;
  jogoSemSofrerGol: number;
  cartaoAmarelo: number;
  golContra: number;
  note?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { summary, players } = await req.json() as { summary: string; players: PlayerIn[] };
    if (!summary || typeof summary !== 'string' || !Array.isArray(players) || players.length === 0) {
      return new Response(JSON.stringify({ error: 'Envie "summary" (texto) e "players" (lista).' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY ausente' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const roster = players.map(p => `- ${p.name} (id=${p.id}, pos=${p.position})`).join('\n');

    const system = `Você é um assistente que extrai estatísticas de partidas de futebol amador (pelada) a partir de um resumo escrito informalmente pelo técnico.
Retorne APENAS JSON válido, sem comentários, sem markdown, no formato:
{
  "players": [
    {
      "playerId": "<id do jogador do elenco>",
      "gols": 0,
      "assistencias": 0,
      "desarmes": 0,
      "defesasDificeis": 0,
      "jogoSemSofrerGol": 0,
      "cartaoAmarelo": 0,
      "golContra": 0,
      "note": "trecho opcional do resumo que justifica"
    }
  ]
}

Regras:
- Use APENAS ids do elenco fornecido. Se um nome no resumo não bater com nenhum jogador do elenco, IGNORE.
- Case/acentos são flexíveis: "joao" = "João". Apelidos comuns também (ex: "Jô" para "João").
- Só inclua jogadores mencionados no resumo. NÃO invente ninguém.
- Números devem ser inteiros >= 0.
- "defesasDificeis" só faz sentido para goleiros (pos=GL). Para os outros mantenha 0.
- "jogoSemSofrerGol" só para GL/ZG/LE/LD.
- Se o resumo disser "time X não sofreu gol", marque jogoSemSofrerGol=1 para todos os defensores e goleiro daquele time mencionados.`;

    const userMsg = `ELENCO:\n${roster}\n\nRESUMO DA PARTIDA:\n"""${summary}"""`;

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Lovable-API-Key': apiKey,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMsg },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: 'Limite de requisições da IA atingido. Tente em instantes.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: 'Créditos de IA esgotados. Adicione créditos no workspace.' }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!resp.ok) {
      const txt = await resp.text();
      return new Response(JSON.stringify({ error: `IA falhou: ${txt.slice(0, 200)}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await resp.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '{}';
    let parsed: { players?: ScoutOut[] } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    }

    const validIds = new Set(players.map(p => p.id));
    const clean: ScoutOut[] = (parsed.players ?? [])
      .filter(p => p && typeof p.playerId === 'string' && validIds.has(p.playerId))
      .map(p => ({
        playerId: p.playerId,
        gols: Math.max(0, Math.floor(Number(p.gols) || 0)),
        assistencias: Math.max(0, Math.floor(Number(p.assistencias) || 0)),
        desarmes: Math.max(0, Math.floor(Number(p.desarmes) || 0)),
        defesasDificeis: Math.max(0, Math.floor(Number(p.defesasDificeis) || 0)),
        jogoSemSofrerGol: Math.max(0, Math.min(1, Math.floor(Number(p.jogoSemSofrerGol) || 0))),
        cartaoAmarelo: Math.max(0, Math.floor(Number(p.cartaoAmarelo) || 0)),
        golContra: Math.max(0, Math.floor(Number(p.golContra) || 0)),
        note: typeof p.note === 'string' ? p.note.slice(0, 200) : undefined,
      }));

    return new Response(JSON.stringify({ players: clean }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
