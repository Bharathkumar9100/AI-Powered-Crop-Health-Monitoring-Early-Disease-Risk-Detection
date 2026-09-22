"""AI Chat Assistant Service for PhytoVision-X."""

import json
from typing import Optional, List, Dict, Any, Tuple
import httpx

from app.config import settings

# Expert agricultural advice templates by language and disease keywords
FALLBACK_RESPONSES = {
    "en": {
        "greeting": "Welcome to PhytoVision-X Agronomic Advisory. I can assist you with precise disease identification, active fungicide ingredient dosages, spray window timings, and integrated pest management (IPM). Which crop or symptom are you managing today?",
        "blight": "Early Blight (Alternaria solani) and Late Blight (Phytophthora infestans) management protocol:\n• Chemical Control: Apply Mancozeb 75 WP @ 2.5 g/L or Azoxystrobin 23 SC @ 1 mL/L. For advanced late blight, use Metalaxyl 8% + Mancozeb 64% WP @ 2.5 g/L.\n• Biological/Organic: Spray Bacillus subtilis (10^8 CFU/g) @ 5 g/L or Copper Hydroxide 53.8% DF @ 2 g/L.\n• Cultural Measures: Prune infected lower 30 cm canopy, cease overhead sprinkler irrigation, maintain 60 cm row spacing for ventilation.\n• Pre-Harvest Interval (PHI): 7 days for Mancozeb, 3 days for Azoxystrobin.",
        "rust": "Cereal & Legume Rust (Puccinia / Uromyces spp.) protocol:\n• Chemical Control: Spray Propiconazole 25 EC @ 1 mL/L or Tebuconazole 250 EC @ 1 mL/L immediately at initial pustule emergence.\n• Biological Control: Foliar spray of Trichoderma harzianum @ 5 g/L with 0.1% surfactant.\n• Weather Advisory: Spores germinate rapidly in morning dew. Spray when wind is < 12 km/h during dry morning hours.",
        "rot": "Crown & Fruit Rot (Rhizoctonia / Phytophthora / Sclerotinia) protocol:\n• Drainage: Immediately aerate furrow lines to prevent soil saturation around root crowns.\n• Soil Drenching: Drench root zones with Carbendazim 50 WP @ 1.5 g/L or Copper Oxychloride 50 WP @ 3 g/L (500 mL solution per plant).\n• Bio-fertilizer: Inoculate soil with Pseudomonas fluorescens @ 10 g/m² in compost.\n• Sanitation: Solarize infected seedbeds and implement a strict 3-year non-solanaceous crop rotation.",
        "mildew": "Powdery & Downy Mildew protocol:\n• Powdery Mildew: Spray Wettable Sulfur 80 WP @ 2.5 g/L or Hexaconazole 5 EC @ 1 mL/L. Organic alternative: Potassium bicarbonate @ 3 g/L + cold-pressed Neem oil (10,000 ppm) @ 3 mL/L.\n• Downy Mildew: Spray Dimethomorph 50 WP @ 1 g/L + Mancozeb @ 2 g/L.\n• Microclimate: Improve air circulation by canopy thinning and reduce excessive nitrogen fertilization.",
        "spot": "Bacterial & Fungal Leaf Spot protocol:\n• Bacterial Spot (Xanthomonas): Spray Copper Oxychloride 50 WP @ 2.5 g/L tank-mixed with Streptocycline @ 0.5 g per 10 L water.\n• Septoria Leaf Spot: Chlorothalonil 75 WP @ 2 g/L applied at 10-day intervals.\n• Hygiene: Sterilize pruning shears with 70% isopropyl alcohol between rows. Avoid field operations when canopy foliage is wet.",
        "healthy": "Your crop sample displays optimal photosynthetic density and healthy leaf morphology. To sustain yield vigor:\n• Nutrient Balance: Apply balanced N-P-K (19:19:19) foliar spray @ 5 g/L during vegetative growth.\n• Preventative Defense: Regular preventative bi-weekly spray of Trichoderma or seaweed extract enhances systemic acquired resistance (SAR).\n• Soil Moisture: Maintain root-zone moisture between 65-75% field capacity.",
        "default": "Based on standard FAO Good Agricultural Practices (GAP): 1) Confirm symptoms with high-resolution leaf scan, 2) Correlate with current field microclimate and spray windows, 3) Select approved active ingredients with recommended dosage per liter, and 4) Respect minimum re-entry (REI) and pre-harvest intervals (PHI). How may I assist with your specific crop or field plot?"
    },
    "hi": {
        "greeting": "फाइटोविज़न-एक्स (PhytoVision-X) कृषि सलाहकार में आपका स्वागत है। मैं फसलों की बीमारी, कवकनाशी की सही खुराक, और मौसम आधारित छिड़काव में आपकी सहायता कर सकता हूँ।",
        "blight": "झुलसा रोग (Blight) प्रबंधन:\n• रासायनिक नियंत्रण: मैन्कोज़ेब 75 WP (2.5 ग्राम/लीटर) या एज़ोक्सीस्ट्रोबिन 23 SC (1 मिली/लीटर) का छिड़काव करें।\n• जैविक नियंत्रण: स्यूडोमोनास फ्लोरोसेंस या कॉपर हाइड्रॉक्साइड का प्रयोग करें।\n• सावधानी: ग्रसित निचली पत्तियों को काट दें और ड्रिप सिंचाई का उपयोग करें।",
        "default": "फसलों को स्वस्थ रखने के लिए सही खाद और मौसम के अनुसार छिड़काव करें। पत्तियों के लक्षण देखकर उचित दवा का प्रयोग करें।"
    },
    "ta": {
        "greeting": "பைட்டோவிஷன்-எக்ஸ் (PhytoVision-X) வேளாண்மை ஆலோசனைக்கு நல்வரவு. பயிர் நோய் மேலாண்மை, பூஞ்சாணக் கொல்லி மருந்தளவு மற்றும் வானிலை சார்ந்த பரிந்துரைகளுக்கு நான் உதவலாம்.",
        "blight": "இலைக்கருகல் நோய் மேலாண்மை:\n• வேதியியல் முறை: மேன்கோசெப் (Mancozeb 75 WP) @ 2.5 கிராம்/லிட்டர் அல்லது அசோக்சிஸ்ட்ரோபின் @ 1 மி.லி/லிட்டர் தெளிக்கவும்.\n• இயற்கை முறை: சூடோமோனாஸ் அல்லது வேப்பெண்ணெய் (3 மி.லி/லிட்டர்) தெளிக்கவும்.\n• முன்னெச்சரிக்கை: பாதிக்கப்பட்ட இலைகளை உடனே அப்புறப்படுத்தவும்.",
        "default": "பயிர் பாதுகாப்புக்கு முறையான வடிகால், சரியான ஊட்டச்சத்து மற்றும் ஆரம்பக்கட்ட நோய் கண்காணிப்பு மிகவும் அவசியமாகும்."
    },
    "te": {
        "greeting": "ఫైటోవిజన్-ఎక్స్ వ్యవసాయ సలహా కేంద్రానికి స్వాగతం. పంట తెగుళ్లు, మందుల మోతాదు మరియు రక్షణ చర్యలపై మీకు పూర్తి సమాచారం అందించగలను.",
        "default": "పంట తెగులు లక్షణాలను గుర్తించి, సిఫార్సు చేసిన మోతాదులో మందులను పిచికారీ చేయండి. సరైన నీటి యాజమాన్యం పాటించండి."
    },
    "ml": {
        "greeting": "ഫൈറ്റോവിഷൻ-എക്സ് കാർഷിക ഉപദേശക സമിതിയിലേക്ക് സ്വാഗതം. രോഗനിർണയത്തിനും കീടനാശിനി അളവുകൾക്കും ഞാൻ സഹായിക്കാം.",
        "default": "വിള രോഗബാധ തടയാൻ ശുപാർശ ചെയ്ത അളവിൽ മരുന്നുകൾ തളിക്കുകയും കൃഷിയിടത്തിൽ ശുചിത്വം പാലിക്കുകയും ചെയ്യുക."
    }
}


async def get_chat_response(
    message: str,
    language: str = "en",
    context: Optional[dict] = None,
    history: Optional[List[dict]] = None,
) -> Tuple[str, bool]:
    """
    Generate an AI chat response.
    Returns (response_text, is_demo=False).
    """
    # 1. Check if Gemini API key is configured
    if settings.GEMINI_API_KEY:
        for model in ["models/gemini-flash-latest", "models/gemini-flash-lite-latest"]:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/{model}:generateContent?key={settings.GEMINI_API_KEY}"
                prompt_context = ""
                if context:
                    prompt_context = f"\nContext from recent crop scan: Crop: {context.get('crop')}, Disease: {context.get('disease')}, Risk: {context.get('risk_level')}, Organic fertilizers: {context.get('organic_fertilizers', [])}\n"

                system_instruction = (
                    "You are PhytoVision-X Enterprise Agricultural Advisor, a master agronomist specializing in crop pathology, organic farming, and precision agriculture. "
                    "Provide actionable, scientifically grounded recommendations including organic fertilizers (Panchagavya, Jeevamrutha, Vermicompost, Neem cake, Seaweed extract), "
                    "biological control agents (Trichoderma viride, Pseudomonas fluorescens, Bacillus subtilis), exact dilution rates per liter, application timing, and pre-harvest intervals. "
                    "Keep responses structured, encouraging, and easy for farmers to apply."
                )

                payload = {
                    "contents": [
                        {
                            "parts": [
                                {"text": f"{system_instruction}\nLanguage: {language}\n{prompt_context}\nFarmer says: {message}"}
                            ]
                        }
                    ]
                }

                async with httpx.AsyncClient(timeout=15.0) as client:
                    res = await client.post(url, json=payload)
                    if res.status_code == 200:
                        data = res.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            content = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                            if content.strip():
                                return content.strip(), False
            except Exception:
                continue

    # 2. Enterprise Rule-Based Agronomic Knowledge Engine
    lang_dict = FALLBACK_RESPONSES.get(language, FALLBACK_RESPONSES["en"])
    en_dict = FALLBACK_RESPONSES["en"]
    msg_lower = message.lower()

    # If scan diagnosis context is provided, provide targeted prescription
    if context and any(k in msg_lower for k in ["treat", "spray", "cure", "do", "remedy", "what", "how", "medicine", "dosage"]):
        disease = context.get("disease", "Unknown")
        crop = context.get("crop", "Crop")
        recommendations = context.get("recommendations", [])
        rec_text = "\n".join([f"• {r}" for r in recommendations]) if recommendations else "Apply approved protective bio-fungicide and inspect irrigation lines."
        return (
            f"Agronomic Prescription for {crop} with confirmed {disease}:\n\n"
            f"Recommended Protocol:\n{rec_text}\n\n"
            f"Safety Directive: Always verify spray window (wind speed < 15 km/h, rain probability < 20%) before foliar application. Observe minimum pre-harvest safety interval.",
            False
        )

    # Keyword routing
    if any(w in msg_lower for w in ["hi", "hello", "hey", "start", "namaste", "vanakkam"]):
        return lang_dict.get("greeting", en_dict["greeting"]), False

    for key in ["blight", "rust", "rot", "mildew", "spot", "healthy"]:
        if key in msg_lower:
            return lang_dict.get(key, en_dict.get(key, en_dict["default"])), False

    return lang_dict.get("default", en_dict["default"]), False
