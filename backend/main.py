import json, os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from uuid import uuid4
from gtts import gTTS
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import google.generativeai as genai
import re
import time
genai.configure(api_key="AIzaSyBod2CnABv7ancPCbOGSgIhbmfOCqyGS-U")
# ------------------- FastAPI Setup -------------------
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------- Load Products -------------------
with open("products.json", "r") as f:
    PRODUCTS = json.load(f)

# ------------------- Load LLM -------------------
# tokenizer = AutoTokenizer.from_pretrained("google/flan-t5-small")
# model = AutoModelForSeq2SeqLM.from_pretrained("google/flan-t5-small")

# ------------------- Session Store -------------------
sessions = {}
def get_or_create_session(session_id: str):
    session_ids= [v["id"] for v in sessions.values()]
    print('session_ids', session_ids, )
    if not session_id or session_id not in session_ids:
        sid = str(uuid4())
        sessions[sid] = {"id": sid, "history": [], "lastFilters": {}}
        return sessions[sid]
    return sessions[session_id]

# ------------------- Models -------------------
class SearchRequest(BaseModel):
    query: str
    sessionId: str | None = None

# ------------------- LLM Parser -------------------
def parse_with_llm(query: str, prev_filters: dict):
    if "reset" in query.lower() or "clear" in query.lower():
        return {"reset": True}
    prompt = f"""
    Convert this product search into JSON:
    {{"category": null, "color": null, "minPrice": null, "maxPrice": null, "keywords": null}}
    Previous filters: {prev_filters}
    Query: "{query}"
    Respond with ONLY valid JSON.
    """

    model = genai.GenerativeModel("gemini-2.5-flash")
    response = model.generate_content(prompt)
    text = response.text.strip()

    # Extract JSON from the response
    match = re.search(r"{.*}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            return {}
    return {}
def merge_filters(prev: dict, new: dict):
    merged = prev.copy()
    for k, v in new.items():
        if v is not None:
            merged[k] = v
    return merged

def apply_filters(products, filters):
    results = []
    for p in products:
        if filters.get("category") and p["category"].lower() != filters["category"].lower():
            continue
        if filters.get("color") and p["color"].lower() != filters["color"].lower():
            continue
        if filters.get("minPrice") and p["price"] < filters["minPrice"]:
            continue
        if filters.get("maxPrice") and p["price"] > filters["maxPrice"]:
            continue
        results.append(p)
    return results

# ------------------- TTS -------------------
AUDIO_DIR = "audio"
os.makedirs(AUDIO_DIR, exist_ok=True)

def text_to_speech(text: str, sid: str):
    import time

def text_to_speech(text: str, sid: str):
    # Delete any old files for this session
    for f in os.listdir(AUDIO_DIR):
        if f.startswith(sid):
            try:
                os.remove(os.path.join(AUDIO_DIR, f))
            except:
                pass

    # Create a fresh file with unique name
    filename = f"{sid}_{int(time.time()*1000)}.mp3"
    filepath = os.path.join(AUDIO_DIR, filename)
    gTTS(text=text, lang="en").save(filepath)
    return f"/api/audio/{filename}"


# ------------------- Routes -------------------
@app.post("/api/search")
async def search(req: SearchRequest):
    session = get_or_create_session(req.sessionId)
    sid = session["id"]
    print('session', sessions)
    print('req.sessionId', req.sessionId)
    try:
        parsed = parse_with_llm(req.query, session["lastFilters"])
    except Exception as e:
        print("LLM failed:", e)
        parsed = {}
    if parsed.get("reset"):
        session["lastFilters"] = {}
        session["history"] = []
        return {
            "sessionId": sid,
            "message": "Search reset successfully",
            "filters": {},
            "products": PRODUCTS,  # show all products
            "audioUrl": text_to_speech("Search reset successfully", sid),
        }
    merged = merge_filters(session["lastFilters"], parsed)
    session["lastFilters"] = merged
    session["history"].append({"query": req.query, "parsed": parsed, "merged": merged})

    results = apply_filters(PRODUCTS, merged)

    parts = []
    if merged.get("color"): 
        parts.append(merged["color"])
    if merged.get("category"): 
        parts.append(merged["category"])

    if merged.get("minPrice") and merged.get("maxPrice"):
        parts.append(f"price between {merged['minPrice']} and {merged['maxPrice']}")
    elif merged.get("maxPrice"):
        parts.append(f"price under {merged['maxPrice']}")
    elif merged.get("minPrice"):
        parts.append(f"price above {merged['minPrice']}")

    summary = f"Showing {len(results)} result(s) for {', '.join(parts) or 'your query'}"

    audio_url = text_to_speech(summary, sid)

    return {
        "sessionId": sid,
        "message": summary,
        "filters": merged,
        "products": results,
        "audioUrl": audio_url
    }

@app.get("/api/audio/{filename}")
async def get_audio(filename: str):
    filepath = os.path.join(AUDIO_DIR, filename)
    if os.path.exists(filepath):
        return FileResponse(filepath, media_type="audio/mpeg", filename=filename)
    return {"error": "Audio not found"}

@app.get("/api/products")
async def get_products():
    return {"products": PRODUCTS}
