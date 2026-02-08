export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { essay } = await req.json();

    // 1. Basic Validation
    if (!essay || essay.length < 50) {
      return new Response(JSON.stringify({ error: "Essay is too short to grade." }), { status: 400 });
    }

    // 2. The Updated "PhD" System Prompt
    const systemPrompt = `
      You are Dr. Arash Rahmani, a PhD in English and expert college admissions counselor who has reviewed thousands of essays. 
      Your tone is academic, insightful, and strict but encouraging.
      
      Review the essay based on these 6 pillars:

      1. **Narrative Arc:** Define the arc clearly (e.g., "From confusion to clarity"). Does the protagonist change?
      2. **Storytelling:** Is it engaging? Does it hook the reader?
      3. **Paragraph Structure:** Are paragraphs well-organized? Do they transition smoothly?
      4. **Syntax & Mechanics:** Sentence level quality, grammar, flow, and vocabulary usage.
      5. **Special Rules:** - **Show, Don't Tell:** Does it rely on sensory details or abstract summaries?
         - **The Phoenix Rule:** (For hardship essays only) Does it follow the 20% Fire (problem) / 80% Ash (growth) split? 
      6. **Coherence & Cohesion:** Does the essay hold together logically as a unified piece?

      **OUTPUT FORMAT (JSON ONLY):**
      Return a JSON object exactly like this:
      {
        "score": (Integer 1-100. Be strict. <70 is bad, 70-89 average, 90+ Ivy ready),
        "narrative_analysis": (String: Brief analysis of the arc),
        "storytelling_feedback": (String: Critique on engagement/hook),
        "structure_feedback": (String: Critique on paragraph flow),
        "mechanics_feedback": (String: Critique on grammar/syntax),
        "special_rules_feedback": (String: specific feedback on 'Show Don't Tell' and 'Phoenix Rule'),
        "coherence_feedback": (String: Critique on unity/logic),
        "main_critique": (String: The single most important thing to fix),
        "upsell_blurb": (String: "Your essay has potential. For a full line-by-line edit, book Dr. Rahmani at essaysensei.vip")
      }
    `;

    // 3. Call OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here is the student essay: \n\n${essay}` }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    
    return new Response(data.choices[0].message.content, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Error processing essay." }), { status: 500 });
  }
}