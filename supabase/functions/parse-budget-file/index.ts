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

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    const isPdf = file.type === 'application/pdf' || fileName.endsWith('.pdf');
    const mimeType = isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are a budget data extraction assistant. Extract budget/expense categories from the uploaded document.
    
Return a JSON object with this exact structure:
{
  "categories": [
    {
      "code": "STRING - short uppercase code like GENERAL, HEATING, ELEVATOR, CLEANING etc.",
      "label": "STRING - descriptive name of the category",
      "total": NUMBER - the total amount for this category
    }
  ],
  "year": NUMBER or null - the budget year if detectable,
  "period_type": "calendar" or "custom" - whether it's a Jan-Dec budget or custom period,
  "start_month": NUMBER 0-11 - start month if custom period (0=Jan),
  "notes": "STRING - any relevant notes about parsing issues or assumptions"
}

Rules:
- Extract ALL expense categories/line items with their amounts
- If the document has sub-categories, aggregate them into main categories
- Use uppercase codes without spaces (underscores OK)
- Amounts should be numbers without currency symbols
- If you can't determine the year, set it to null
- If the document is unreadable or doesn't contain budget data, return: {"error": "Description of the issue", "categories": []}
- Only return valid JSON, no markdown or extra text`;

    const response = await fetch('https://api.lovable.dev/v1/chat/completions', {
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
                text: `Extract budget categories and amounts from this ${isPdf ? 'PDF' : 'Excel'} file named "${file.name}". Return only the JSON structure as specified.`,
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
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI API error:', errText);
      throw new Error('Failed to process file with AI');
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || '';
    
    // Extract JSON from potential markdown code blocks
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
        error: 'Could not extract structured data from this file. Please ensure it contains a budget table with categories and amounts.',
        categories: [],
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
