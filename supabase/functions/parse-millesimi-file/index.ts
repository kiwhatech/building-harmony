import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];

    const fileName = file.name.toLowerCase();
    const isAllowed = allowedTypes.includes(file.type) || fileName.endsWith('.pdf') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'Unsupported file type. Please upload a PDF or Excel file.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    const isPdf = file.type === 'application/pdf' || fileName.endsWith('.pdf');
    const mimeType = isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are a millesimi data extraction assistant for Italian condominium management. Extract unit information and millesimi values from the uploaded document.

Return a JSON object with this exact structure:
{
  "units": [
    {
      "unit_number": "STRING - the unit number/identifier (e.g. '1', '101', 'A1', 'Int. 1')",
      "owner_name": "STRING or null - the owner/resident name if available",
      "millesimi_value": NUMBER - the millesimi value for this unit (typically out of 1000 total),
      "floor": NUMBER or null - the floor number if available,
      "area_sqft": NUMBER or null - the area/surface in square meters if available
    }
  ],
  "table_code": "STRING - suggested code for the millesimi table (e.g. 'GENERAL', 'PROPRIETA', 'RISCALDAMENTO')",
  "table_label": "STRING - suggested label for the millesimi table (e.g. 'Tabella Generale', 'Spese Generali')",
  "total_millesimi": NUMBER - the sum of all millesimi values,
  "notes": "STRING - any relevant notes about parsing issues or assumptions"
}

Rules:
- Extract ALL units with their millesimi values
- Unit numbers should be cleaned up but preserved as found in the document
- Owner names should include both first and last name when available
- Millesimi values are typically numbers that sum to 1000 (but not always)
- If the document contains multiple millesimi tables, extract the first/main one
- If area/surface data is available (in m², mq, sqm), include it
- If you can't determine a field, set it to null
- If the document is unreadable or doesn't contain millesimi data, return: {"error": "Description of the issue", "units": []}
- Only return valid JSON, no markdown or extra text`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract unit numbers, owner names, and millesimi values from this ${isPdf ? 'PDF' : 'Excel'} file named "${file.name}". This is an Italian condominium millesimi table. Return only the JSON structure as specified.`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64}`,
                },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI API error:', response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add funds to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('Failed to process file with AI');
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || '';

    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error('Failed to parse AI response:', content);
      return new Response(JSON.stringify({
        error: 'Could not extract structured data from this file. Please ensure it contains a millesimi table with unit numbers and values.',
        units: [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
