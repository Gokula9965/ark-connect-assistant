from docx import Document
from docx.shared import Inches, Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
import os

doc = Document()

style = doc.styles['Normal']
font = style.font
font.name = 'Calibri'
font.size = Pt(11)

# ============ TITLE ============
title = doc.add_heading('Ark Connect AI Assistant', level=0)
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
for run in title.runs:
    run.font.size = Pt(24)

subtitle = doc.add_paragraph()
subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = subtitle.add_run('Agentic Use-Case — Solution & Architecture')
run.font.size = Pt(14)
run.font.color.rgb = RGBColor(89, 89, 89)

info = doc.add_paragraph()
info.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = info.add_run('Team: Cache Crew  |  Date: May 28, 2026')
run.font.size = Pt(10)
run.font.color.rgb = RGBColor(120, 120, 120)

doc.add_paragraph('')

# ══════════════════════════════════════════════
# SECTION 1: LEARNING REQUIRED / DONE
# ══════════════════════════════════════════════
doc.add_heading('1. Learning Required / Done for the Use-Case', level=1)

doc.add_paragraph(
    'To build the agentic AI assistant, the following key areas of learning have been explored by the team.'
)

learning_points = [
    'Agentic AI Architecture (Orchestrator Pattern) — Explored how a primary LLM (Gemini) classifies user intent and autonomously routes queries to specialized agents. Each agent operates independently with its own separate data source. Unlike simple RAG where one LLM scrapes through a single database, the agentic approach ensures data isolation, focused retrieval, and the LLM itself makes routing decisions — no hardcoded rules.',
    'Google Gemini API & Model Fallback — Explored the Google Gemini API using the @google/genai SDK. Learned to configure system instructions, manage tokens, and implemented a multi-model fallback strategy (gemini-2.5-flash → gemini-3.5-flash → gemini-2.5-flash-lite) so the system automatically switches models if one hits a rate limit.',
    'RAG (Retrieval Augmented Generation) — Learned how to retrieve relevant data from a data source and pass it as context to the LLM, grounding AI responses in factual data. In our approach, each agent performs its own RAG — querying only its dedicated data source and sending the retrieved data along with the user\'s question to Gemini.',
    'Few-Shot Learning via User Feedback — Explored how to include examples of good Q&A pairs in the prompt so the LLM learns the expected response pattern. When a user rates a response as helpful (👍), the Q&A pair is stored and included in future prompts. Over time, each agent improves without any model retraining.',
    'Conversation Memory — Since LLMs are stateless, explored how to send the last 10 messages as chat history with each request. This allows the Orchestrator and Agents to understand follow-up questions like "Who can do this?" or "Tell me more" — enabling natural, multi-turn conversations.',
    'Multilingual NLP — Explored how Gemini classifies intent based on meaning, not language. A Tamil question is classified the same as an English one. Agents respond in the user\'s language while keeping technical terms in English. Supports Tamil, Hindi, Tanglish, and any language Gemini understands.',
]
for p in learning_points:
    doc.add_paragraph(p, style='List Bullet')

doc.add_paragraph('')


# ══════════════════════════════════════════════
# SECTION 2: SOLUTION / ARCHITECTURE
# ══════════════════════════════════════════════
doc.add_heading('2. Solution / Architecture', level=1)

doc.add_heading('2.1 Problem Statement', level=2)
doc.add_paragraph(
    'Ark Connect is a church community management platform. Users often need guidance on features like '
    'creating groups, managing events, inviting members, and understanding permissions. The goal is to build '
    'an AI-powered chat assistant that can guide users through the platform in any language.'
)

doc.add_heading('2.2 Our Approach — Multi-Agent Agentic Architecture', level=2)
doc.add_paragraph(
    'Instead of a single LLM scraping through one combined database (which is not a true agentic implementation), '
    'we are using the Orchestrator Pattern where:'
)

points = [
    'An LLM (Gemini) acts as the Orchestrator — it classifies the user\'s intent and decides which agent should handle the query',
    'Four specialized agents will handle different domains: Onboarding, Features, FAQ, and Roles',
    'Each agent will have its own separate data source — ensuring data isolation and focused retrieval',
    'The selected agent will independently query its own data source, construct a prompt, and call Gemini to generate a response',
    'A feedback loop will enable few-shot learning — the AI will improve over time from user feedback',
    'Conversation history will be passed to enable contextual follow-up questions',
]
for p in points:
    doc.add_paragraph(p, style='List Bullet')

doc.add_heading('2.3 Architecture Diagram', level=2)
if os.path.exists('ark_agentic_architecture.png'):
    doc.add_picture('ark_agentic_architecture.png', width=Inches(5.8))
    last_paragraph = doc.paragraphs[-1]
    last_paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER

doc.add_paragraph('')

doc.add_heading('2.4 How It Works — Step by Step', level=2)
doc.add_paragraph(
    'The architecture diagram above shows the complete flow of how the AI assistant processes a user query. '
    'Here is a step-by-step explanation:'
)

doc.add_heading('Step 1 — User Asks a Question', level=3)
step1 = [
    'The user types a question in the chat UI, for example: "How to create a group?"',
    'The frontend (React) sends this question along with the recent conversation history to the backend',
    'The conversation history allows the AI to understand follow-up questions like "Who can do this?"',
]
for p in step1:
    doc.add_paragraph(p, style='List Bullet')

doc.add_heading('Step 2 — Orchestrator Classifies Intent (Gemini Call #1)', level=3)
step2 = [
    'The Orchestrator receives the question and sends it to Google Gemini API for intent classification',
    'Gemini analyzes the question and returns a single word — the intent category',
    'Possible intents: "onboarding", "features", "faq", or "roles"',
    'Example: "How to create a group?" → Gemini returns "features"',
    'This works in any language — Tamil, Hindi, Tanglish — because Gemini classifies based on meaning',
]
for p in step2:
    doc.add_paragraph(p, style='List Bullet')

doc.add_heading('Step 3 — Selected Agent Activates', level=3)
step3 = [
    'Based on the classified intent, the Orchestrator routes the query to the matching agent',
    'Only one agent activates per query — the others remain idle',
    'Example: intent = "features" → Features Agent is selected',
    'Each agent is a specialized module focused on one domain of Ark Connect',
]
for p in step3:
    doc.add_paragraph(p, style='List Bullet')

doc.add_heading('Step 4 — Agent Queries Its Own Data Source', level=3)
step4 = [
    'The selected agent queries its own separate, dedicated data source from the database',
    'Onboarding Agent → queries only Onboarding Data (church setup, member onboarding)',
    'Features Agent → queries only Features Data (groups, events, messaging, donations)',
    'FAQ Agent → queries only FAQ Data (password reset, security, support)',
    'Roles Agent → queries only Roles Data (admin, moderator, member permissions)',
    'No agent can access another agent\'s data — this is data isolation',
]
for p in step4:
    doc.add_paragraph(p, style='List Bullet')

doc.add_heading('Step 5 — Agent Sends Data to Gemini (Gemini Call #2)', level=3)
step5 = [
    'The agent assembles a prompt with: System Prompt + Knowledge Data + Learned Examples + Chat History + Question',
    'This complete prompt is sent to Google Gemini API for response generation',
    'Gemini uses all this context to generate an accurate, grounded response',
    'The response is contextual — it considers the conversation history and domain-specific knowledge',
]
for p in step5:
    doc.add_paragraph(p, style='List Bullet')

doc.add_heading('Step 6 — User Receives the Answer', level=3)
step6 = [
    'The AI-generated response is sent back to the frontend and displayed in the chat UI',
    'The response includes step-by-step instructions, role information, and relevant details',
    'The user can rate the response using 👍 (helpful) or 👎 (not helpful) buttons',
]
for p in step6:
    doc.add_paragraph(p, style='List Bullet')

doc.add_heading('Step 7 — Feedback Loop (AI Learns)', level=3)
step7 = [
    'When a user clicks 👍, the question-answer pair is saved as a "learned example" for that agent',
    'Next time that agent handles a similar query, it loads these learned examples into its prompt',
    'Gemini sees these past good answers and generates similar-quality responses',
    'Over time, each agent accumulates more good examples and produces better answers',
    'This is Few-Shot Learning — the AI improves without any model retraining',
]
for p in step7:
    doc.add_paragraph(p, style='List Bullet')

doc.add_paragraph('')

# ══════════════════════════════════════════════
# SECTION 3: KEY INFO — AI, UPDATES, PROGRESS
# ══════════════════════════════════════════════
doc.add_heading('3. Key Info — AI, Updates & Use-Case Progress', level=1)

doc.add_heading('3.1 AI-Related Key Information', level=2)

doc.add_heading('LLM Used', level=3)
llm_points = [
    'Google Gemini API — primary model: gemini-2.5-flash',
    'Fallback models: gemini-3.5-flash and gemini-2.5-flash-lite (used when primary hits rate limits)',
    'Each user question requires 2 Gemini API calls — Call #1 for intent classification, Call #2 for response generation',
]
for p in llm_points:
    doc.add_paragraph(p, style='List Bullet')

doc.add_heading('Agentic Pattern', level=3)
pattern_points = [
    'Orchestrator (LLM) classifies user intent → routes to the correct specialized agent',
    'Agent queries its own data source → constructs prompt → calls LLM for response',
    'The LLM makes the routing decision autonomously — no hardcoded rules',
]
for p in pattern_points:
    doc.add_paragraph(p, style='List Bullet')

doc.add_heading('Token & Cost Optimization', level=3)
token_points = [
    'System prompts optimized to ~50 words per agent (reduced from ~250 words) — ~80% savings',
    'Each agent loads only its own data source — ~75% less context sent to Gemini',
    'Conversation history capped at last 10 messages to limit token usage',
    'Learned examples limited to top 5 per agent',
]
for p in token_points:
    doc.add_paragraph(p, style='List Bullet')

doc.add_heading('Learning & Improvement', level=3)
learning_points = [
    'Few-shot learning through user feedback (👍/👎)',
    'Good Q&A pairs are stored and reused as examples in future prompts',
    'Each agent independently improves over time based on its own feedback data',
    'No model retraining required — improvement happens through better prompt context',
]
for p in learning_points:
    doc.add_paragraph(p, style='List Bullet')

doc.add_heading('Multilingual Support', level=3)
multi_points = [
    'Users can ask questions in any language — Tamil, Hindi, Tanglish, English, etc.',
    'Gemini classifies intent based on meaning, not language',
    'Agents respond in the user\'s language while keeping technical terms in English',
]
for p in multi_points:
    doc.add_paragraph(p, style='List Bullet')

doc.add_paragraph('')

doc.add_heading('3.2 Use-Case Progress', level=2)

doc.add_heading('✅ Completed', level=3)
completed = [
    'Research & Learning — explored agentic patterns, Gemini API, prompt engineering, and RAG concepts',
    'Architecture Design — designed multi-agent orchestrator pattern with separate data sources per agent',
]
for p in completed:
    doc.add_paragraph(p, style='List Bullet')

doc.add_heading('🔄 In Progress', level=3)
in_progress = [
    'Frontend Chat UI — building React chat interface with markdown rendering, suggestions, and feedback',
    'Backend API + Agents — developing Node.js backend with orchestrator, 4 specialized agents, and routing',
    'Database & Data Sources — setting up PostgreSQL with separate data source per agent',
    'Gemini Integration — integrating Gemini SDK with model fallback and prompt optimization',
]
for p in in_progress:
    doc.add_paragraph(p, style='List Bullet')

doc.add_heading('📋 Planned', level=3)
planned = [
    'Few-Shot Learning — implement feedback-driven learning system for continuous improvement',
    'Testing & Demo — end-to-end testing with multilingual queries and demo preparation',
]
for p in planned:
    doc.add_paragraph(p, style='List Bullet')

doc.add_paragraph('')

doc.add_heading('3.3 What We Are Building', level=2)
updates = [
    'A Multi-Agent AI Assistant for Ark Connect using the Orchestrator Pattern with Google Gemini',
    'The Orchestrator (LLM) will classify user intent and route queries to the correct specialized agent',
    'Each agent will have its own separate data source to ensure data isolation and focused retrieval',
    '4 agents planned: Onboarding Agent, Features Agent, FAQ Agent, Roles Agent',
    'Few-shot learning will enable the AI to improve over time based on user feedback (👍/👎)',
    'Conversation memory will allow contextual follow-up questions within a chat session',
    'Multilingual support — users can ask in Tamil, Hindi, Tanglish, or any language',
    'Token optimization through concise prompts and data isolation (~75-80% token savings)',
    'Model fallback strategy (3 Gemini models) for production resilience against rate limits',
]
for update in updates:
    doc.add_paragraph(update, style='List Bullet')

# ============ SAVE ============
output_path = '/home/gokula-krishnan/Desktop/steward-project/ark-connect-assistant/Ark_Connect_Agentic_AI_Learning_Document.docx'
doc.save(output_path)
print(f'✅ Document saved: {output_path}')
