import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Expose-Headers': 'X-Conversation-Id',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { analysisId, conversationId, userId, messages } = await req.json();

    console.log('Chat request received:', { analysisId, conversationId, messageCount: messages?.length });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Load or create conversation
    let currentConversationId = conversationId;
    
    if (!currentConversationId && userId) {
      // Try to find existing conversation
      const { data: existingConv } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('user_id', userId)
        .eq('analysis_id', analysisId)
        .single();

      if (existingConv) {
        currentConversationId = existingConv.id;
      } else {
        // Create new conversation
        const { data: analysis } = await supabase
          .from('user_analyses')
          .select('product_name')
          .eq('id', analysisId)
          .single();

        const { data: newConv } = await supabase
          .from('chat_conversations')
          .insert({
            user_id: userId,
            analysis_id: analysisId,
            title: `Chat about ${analysis?.product_name || 'Product'}`
          })
          .select()
          .single();

        if (newConv) {
          currentConversationId = newConv.id;
          console.log('Created new conversation:', currentConversationId);
        }
      }
    }

    // Load analysis context
    const { data: analysis, error } = await supabase
      .from('user_analyses')
      .select('*')
      .eq('id', analysisId)
      .single();

    if (error || !analysis) {
      console.error('Analysis not found:', error);
      throw new Error('Analysis not found');
    }

    console.log('Analysis loaded:', { productName: analysis.product_name, score: analysis.epiq_score });

    const recommendations = typeof analysis.recommendations_json === 'string'
      ? JSON.parse(analysis.recommendations_json)
      : analysis.recommendations_json;

    const aiExplanation = recommendations.ai_explanation || null;

    const systemPrompt = `You are SkinLytixGPT, an AI assistant helping users understand their product analysis results in the SkinLytix app.

CRITICAL GUARDRAILS (ABSOLUTE - NEVER VIOLATE):
- You are NOT a doctor, esthetician, or dermatologist
- NEVER diagnose conditions (rosacea, eczema, fungal acne, dermatitis, psoriasis, infections)
- NEVER provide medical advice or treatment plans
- NEVER advise on prescription medications
- NEVER confirm safety for pregnancy/breastfeeding/medical conditions
- NEVER give urgent medical instructions

WHEN TO REFER TO PROFESSIONALS:
- User mentions diagnosed/suspected medical conditions
- Questions about severe reactions (burning, blistering, swelling)
- Complex medical concerns or prescription-strength products
- Persistent or worsening skin issues

CURRENT ANALYSIS CONTEXT:
Product: ${analysis.product_name} ${analysis.brand ? `by ${analysis.brand}` : ''}
Category: ${analysis.category || 'Not specified'}
EpiQ Score: ${analysis.epiq_score}/100 - ${recommendations.score_label || 'Not rated'}

Ingredients (Full List):
${analysis.ingredients_list}

Safe Ingredients (${recommendations.safe_ingredients?.length || 0}):
${recommendations.safe_ingredients?.map((i: any) => `- ${typeof i === 'string' ? i : i.name}${i.role ? ` (${i.role})` : ''}`).join('\n') || 'None listed'}

Beneficial Ingredients (${recommendations.beneficial_ingredients?.length || 0}):
${recommendations.beneficial_ingredients?.map((i: any) => `- ${i.name}: ${i.benefit}`).join('\n') || 'None listed'}

Problematic/Flagged Ingredients (${recommendations.problematic_ingredients?.length || 0}):
${recommendations.problematic_ingredients?.map((i: any) => `- ${i.name}: ${i.reason}`).join('\n') || 'None flagged'}

Routine Suggestions:
${recommendations.routine_suggestions?.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n') || 'None provided'}

${aiExplanation?.summary_one_liner ? `Previous AI Analysis Summary:\n${aiExplanation.summary_one_liner}\n\nSafety Level: ${aiExplanation.safety_level || 'unknown'}` : ''}

YOUR SCOPE IN CHAT MODE:
✅ Answer questions about ingredients in THIS analysis
✅ Explain why certain ingredients were flagged
✅ Discuss routine placement for THIS product
✅ Compare ingredients mentioned in THIS analysis
✅ Clarify the EpiQ score and calculation
✅ Suggest general skin type compatibility based on THIS analysis

❌ Do NOT invent ingredients not in the analysis
❌ Do NOT diagnose skin conditions
❌ Do NOT provide medical treatment advice
❌ Do NOT guarantee results or outcomes
❌ Do NOT discuss products not in this analysis

TONE:
- Warm, clear, science-informed
- Knowledgeable friend, not medical authority
- Honest about limitations ("I can't diagnose that, but here's what I notice...")
- Encourage professional consultation when appropriate

RESPONSE FORMAT:
- Keep responses conversational and concise (2-4 paragraphs max)
- Use markdown sparingly (bold for emphasis, bullets when helpful)
- When recommending professional help, be supportive not alarming
- Reference specific ingredients/data from the analysis
- If you mention professional referral, start response with "⚕️ REFERRAL:" so it can be detected`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Calling AI Gateway with', messages.length, 'messages');

    // Save user message if we have a conversation
    const userMessage = messages[messages.length - 1];
    if (currentConversationId && userMessage.role === 'user') {
      console.log('💾 Saving user message to database...', {
        conversationId: currentConversationId,
        contentLength: userMessage.content.length
      });

      const { data: userData, error: userError } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: currentConversationId,
          role: 'user',
          content: userMessage.content,
          metadata: {}
        })
        .select();

      if (userError) {
        console.error('❌ Failed to save user message:', userError);
      } else {
        console.log('✅ User message saved successfully:', userData?.[0]?.id);
      }
    } else {
      console.log('⚠️ Skipping user message save:', {
        hasConversationId: !!currentConversationId,
        userMessageRole: userMessage?.role
      });
    }

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
          ...messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      console.error('AI Gateway error:', response.status, response.statusText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    console.log('Streaming response back to client');

    // Create a TransformStream to capture the assistant's response
    let assistantResponse = '';
    const { readable, writable } = new TransformStream({
      transform(chunk, controller) {
        // Capture text content from SSE stream
        const text = new TextDecoder().decode(chunk);
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ') && !line.includes('[DONE]')) {
            try {
              const json = JSON.parse(line.slice(6));
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                assistantResponse += content;
              }
            } catch {}
          }
        }
        controller.enqueue(chunk);
      },
      async flush() {
        // Save assistant message after stream completes
        console.log('🔄 FLUSH: Stream completed, checking save conditions...', {
          hasConversationId: !!currentConversationId,
          conversationId: currentConversationId,
          hasResponse: !!assistantResponse,
          responseLength: assistantResponse.length,
          responsePreview: assistantResponse.substring(0, 100)
        });

        if (!currentConversationId) {
          console.warn('⚠️ FLUSH: No conversation ID, skipping database save');
          return;
        }

        if (!assistantResponse) {
          console.warn('⚠️ FLUSH: No assistant response captured, skipping database save');
          return;
        }

        try {
          // Save assistant message
          console.log('💾 FLUSH: Inserting assistant message to database...', {
            conversationId: currentConversationId,
            contentLength: assistantResponse.length
          });

          const { data: messageData, error: messageError } = await supabase
            .from('chat_messages')
            .insert({
              conversation_id: currentConversationId,
              role: 'assistant',
              content: assistantResponse,
              metadata: {}
            })
            .select();

          if (messageError) {
            console.error('❌ FLUSH: Failed to save assistant message:', messageError);
            throw messageError;
          }

          console.log('✅ FLUSH: Assistant message saved successfully:', {
            messageId: messageData?.[0]?.id,
            conversationId: currentConversationId
          });

          // Update conversation timestamp
          console.log('🕒 FLUSH: Updating conversation timestamp...');
          
          const { error: updateError } = await supabase
            .from('chat_conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', currentConversationId);

          if (updateError) {
            console.error('❌ FLUSH: Failed to update conversation timestamp:', updateError);
          } else {
            console.log('✅ FLUSH: Conversation timestamp updated successfully');
          }

          console.log('✨ FLUSH: Database save operations completed successfully');

        } catch (error) {
          console.error('❌ FLUSH: Error during database save:', error);
          console.error('❌ FLUSH: Error details:', {
            error: error instanceof Error ? error.message : String(error),
            conversationId: currentConversationId,
            responseLength: assistantResponse.length
          });
        }
      }
    });

    response.body?.pipeTo(writable);

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'X-Conversation-Id': currentConversationId || '',
      },
    });

  } catch (error) {
    console.error('Chat error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});