import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, systemPrompt, max_tokens } = await req.json()
    const apiKey = Deno.env.get('open_router_api')

    if (!apiKey) {
      throw new Error('Missing open_router_api secret')
    }

    const defaultSystem = 'You are an expert Data Analyst and Business Strategist. Ground all insights in real numbers. Stick strictly to what is necessary, avoid fluff, and format in clean Markdown with headings and bold metrics.'

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://your-platform.com',
        'X-Title': 'Platform AI Analytics',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o',
        max_tokens: typeof max_tokens === 'number' ? max_tokens : 1000,
        messages: [
          { role: 'system', content: systemPrompt || defaultSystem },
          { role: 'user', content: prompt }
        ]
      })
    })

    const data = await response.json()
    
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
