# ai-voice-search

# 🛍️ AI Product Search Assistant

An AI-powered product search system built with **FastAPI**, **Google Gemini API**, and **Text-to-Speech (gTTS)**.  
Users can search products using natural language queries like:

- "Show me red shirts under 1000"
- "Find blue shoes above 2000"
- "Clear search" → resets filters

The backend parses queries with an LLM (Gemini), applies filters on a product database, and returns both text and speech output.

---

## 🚀 Features

- 🔍 **Natural language search** using Google Gemini
- 🗂️ **Persistent session filters** (applies previous filters until reset)
- 🎤 **Voice feedback** via Google TTS (returns `.mp3` files)
- 🎨 **Category images** (shirts, shoes, pants, etc.)
- 🔄 **Reset search** via "reset" / "clear" command
- 🌍 **CORS enabled** for frontend integration

---

## 📂 Project Structure

