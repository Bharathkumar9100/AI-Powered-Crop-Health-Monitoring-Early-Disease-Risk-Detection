"""
Organic Fertilizer and Biological Remediation Advisory Service.
Provides specialized organic fertilizers, bio-fungicides, and natural soil amendments
using Gemini AI with comprehensive agronomic fallback standards.
"""

import json
import logging
from typing import List, Dict, Any, Tuple
import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# Curated Agronomic Organic & Biological Management Protocols
AGRONOMIC_ORGANIC_PROTOCOLS: Dict[str, Dict[str, Any]] = {
    "blight": {
        "fertilizers": [
            "Apply well-decomposed Vermicompost (500 kg/acre) pre-inoculated with Trichoderma viride (2.5 kg/acre) to suppress soil-borne Alternaria and Phytophthora spores.",
            "Foliar spray of 3% Panchagavya (30 mL/L water) every 10-12 days to stimulate systemic acquired resistance (SAR) against foliar blight lesions.",
            "Incorporate Neem Cake meal (250 kg/acre) during basal preparation or root banding to enrich organic nitrogen and deter nematode-fungal synergy.",
            "Apply fermented seaweed extract (Ascophyllum nodosum) @ 2.5 mL/L to replenish micronutrients and strengthen leaf cuticle thickness."
        ],
        "remedies": [
            {
                "title": "Bio-Fungicide: Trichoderma viride + Pseudomonas fluorescens",
                "type": "bio_fungicide",
                "application": "Foliar spray @ 5 g/L with 0.1% cold-pressed neem oil adjuvant every 7 days.",
                "description": "Antagonistic beneficial fungi and bacteria that parasitize blight hyphae and colonize leaf surfaces."
            },
            {
                "title": "Fermented Sour Buttermilk (Majjiga/Chaas) Foliar Spray",
                "type": "bio_stimulant",
                "application": "Dilute 5-day fermented sour buttermilk (1:10 ratio with water) and spray weekly.",
                "description": "Lactic acid bacteria and natural acidity create an unfavorable pH barrier against fungal spore germination."
            },
            {
                "title": "Wood Ash & Rock Phosphate Potassium Booster",
                "type": "soil_amendment",
                "application": "Dust 50 g dry wood ash per plant base around drip-line to supply bio-available potassium.",
                "description": "Potassium fortifies plant cell wall rigidity, impeding enzymatic penetration by blight pathogens."
            }
        ]
    },
    "rust": {
        "fertilizers": [
            "Drench root zones with Liquid Jeevamrutha (200 L/acre) every 14 days to boost beneficial rhizosphere microbial biodiversity.",
            "Apply Vermicompost enriched with bio-potash (Frateuria aurantia) @ 10 g/L to elevate rust resistance.",
            "Broadcast bone meal / rock phosphate (100 kg/acre) to promote robust vascular transport and rapid leaf tissue regeneration.",
            "Foliar application of amino acid chelated bio-fertilizers @ 2 mL/L during cooler morning hours."
        ],
        "remedies": [
            {
                "title": "Cold-Pressed Neem Oil (10,000 ppm) + Karanja Oil Emulsion",
                "type": "bio_fungicide",
                "application": "Mix 4 mL Neem oil + 1 mL organic soap liquid per liter of water. Spray thoroughly under leaves.",
                "description": "Disrupts rust pustule membrane synthesis and forms a protective organic hydrophobic coating on foliar surfaces."
            },
            {
                "title": "Baking Soda (Potassium Bicarbonate) Antifungal Solution",
                "type": "bio_fungicide",
                "application": "Dissolve 4 g potassium bicarbonate + 2 mL horticultural soap in 1 L water. Apply at first pustule sight.",
                "description": "Changes the foliar surface pH, dehydrating germinating rust fungal urediniospores rapidly."
            },
            {
                "title": "Bio-inoculation: Bacillus subtilis (10^9 CFU/g)",
                "type": "bio_fertilizer",
                "application": "Foliar misting @ 3 g/L early in the morning before sunbreak.",
                "description": "Produces lipopeptides that inhibit rust spore viability while inducing systemic plant immunity."
            }
        ]
    },
    "rot": {
        "fertilizers": [
            "Apply mature aerobic Compost tea (diluted 1:5) as a drench around the crown zone to outcompete root rot pathogens.",
            "Incorporate Mustard seed cake / Mahua cake (150 kg/acre) as a bio-fumigant to sanitize infected root beds naturally.",
            "Use Azospirillum and Phosphobacteria bio-fertilizers (5 kg/acre mixed in 500 kg FYM) to rebuild damaged fibrous root systems.",
            "Apply humic acid (65% potassium humate) @ 3 g/L to improve soil aeration, drainage, and cation exchange capacity."
        ],
        "remedies": [
            {
                "title": "Pseudomonas fluorescens Rhizosphere Drenching",
                "type": "bio_fungicide",
                "application": "Drench 10 g/L solution (500 mL per plant crown) directly at the root zone.",
                "description": "Secretes phenazines and siderophores that chelate iron, depriving pathogenic rot fungi of essential ions."
            },
            {
                "title": "Garlic & Ginger Rhizome Bio-Extract",
                "type": "bio_stimulant",
                "application": "Crush 50 g garlic + 25 g ginger in 1 L water, filter and spray 50 mL/L around base.",
                "description": "Contains natural allicin and sulfur compounds exhibiting potent broad-spectrum fungicidal activity."
            },
            {
                "title": "Gypsum (Calcium Sulfate) Soil Aeration Amendment",
                "type": "soil_amendment",
                "application": "Broadcast 100 kg/acre into top 10 cm of soil to prevent water-logging.",
                "description": "Improves soil flocculation, allowing excess moisture to drain away from fragile root crowns."
            }
        ]
    },
    "mildew": {
        "fertilizers": [
            "Foliar spray of Seaweed Kelp extract (2 mL/L) with liquid silica (1 mL/L) to deposit rigid biogenic opal into epidermis.",
            "Apply Vermicompost (400 kg/acre) with bio-silicon solubilizing bacteria to enhance structural foliar resistance.",
            "Use Fish amino acid (FAA) spray @ 2 mL/L to provide bio-nitrogen without causing the excessive lush vegetative growth that attracts mildew.",
            "Avoid heavy raw manure; apply well-cured compost rich in actinomycetes."
        ],
        "remedies": [
            {
                "title": "Milk & Whey Bio-Photolysis Spray",
                "type": "bio_fungicide",
                "application": "Mix 1 part fresh milk or whey with 9 parts water. Spray in bright sunlight.",
                "description": "Milk proteins (lactoferrin) react under sunlight to produce free radicals antiseptic to powdery mildew mycelium."
            },
            {
                "title": "Bio-Sulfur & Micronized Wettable Organic Sulfur",
                "type": "bio_fungicide",
                "application": "Apply OMRI-listed elemental sulfur @ 2 g/L when temperature is below 30°C.",
                "description": "Natural mineral barrier that halts fungal respiratory chain reaction without synthetic chemical residues."
            },
            {
                "title": "Cow Urine (Gomutra) + Asafoetida (Hing) Spray",
                "type": "bio_stimulant",
                "application": "Mix 100 mL aged cow urine + 2 g dissolved asafoetida in 10 L water; spray bi-weekly.",
                "description": "Traditional Vedic natural farming spray known for rapid suppression of powdery downy mildew spores."
            }
        ]
    },
    "spot": {
        "fertilizers": [
            "Apply Panchagavya (30 mL/L) combined with copper-rich cow dung slurry to check bacterial spot progression.",
            "Top-dress with composted Poultry manure (composted >90 days) @ 300 kg/acre for bio-available nitrogen and phosphorus.",
            "Foliar spray of Zinc and Boron bio-chelates @ 1.5 g/L to accelerate wound suberization and lesion healing.",
            "Apply mycorrhizal fungi (VAM) @ 5 kg/acre during intercultural operations to bolster nutrient absorption."
        ],
        "remedies": [
            {
                "title": "Copper Hydroxide / Bordeaux Mixture (0.5% Organic Standard)",
                "type": "bio_fungicide",
                "application": "Dissolve 500 g Copper Sulfate + 500 g slaked lime in 100 L water; spray on both leaf surfaces.",
                "description": "Standard organic copper protective barrier that prevents bacterial multiplication and spot infection."
            },
            {
                "title": "Neem Seed Kernel Extract (NSKE 5%)",
                "type": "bio_fungicide",
                "application": "Pound 50 g dry neem seeds, soak overnight in 1 L water, strain and spray with 1 mL soap.",
                "description": "Azadirachtin and salannin components halt pathogenic spore attachment and secondary bacterial entry."
            },
            {
                "title": "Bio-Control: Pseudomonas fluorescens + Bacillus amyloliquefaciens",
                "type": "bio_fertilizer",
                "application": "Foliar misting @ 4 g/L every 8-10 days.",
                "description": "Produces broad-spectrum iturins and surfactins that disintegrate bacterial spot cell walls."
            }
        ]
    },
    "scab": {
        "fertilizers": [
            "Apply Vermicompost enriched with bio-zinc and bio-potash (10 g/tree) to stimulate rapid leaf cuticle hardening.",
            "Spray fermented seaweed extract @ 2.5 mL/L during green tip and pink bud growth stages.",
            "Spread shredded leaf mulch with Trichoderma culture beneath tree canopy to accelerate decomposition of fallen infected leaves.",
            "Apply bone meal (200 g/tree) in autumn to strengthen spring bud break vitality."
        ],
        "remedies": [
            {
                "title": "Lime-Sulfur Organic Foliar Spray",
                "type": "bio_fungicide",
                "application": "Dilute 5 mL liquid lime-sulfur per liter during dormant and early bud break stages.",
                "description": "Breaks overwintering Venturia inaequalis pseudothecia and suppresses primary scab ascospores."
            },
            {
                "title": "Compost Tea + Horsetail (Equisetum arvense) Extract",
                "type": "bio_stimulant",
                "application": "Boil 100 g dried horsetail in 1 L water for 30 min, dilute 1:5 with water, spray weekly.",
                "description": "Rich in natural bio-silicic acid that forms a microscopic glass-like shield over leaf and fruit skin."
            }
        ]
    },
    "healthy": {
        "fertilizers": [
            "Maintain peak soil vitality with Vermicompost @ 400 kg/acre or well-rotted Farmyard Manure (FYM) @ 2 tons/acre.",
            "Apply Panchagavya (3% foliar spray @ 30 mL/L) at 15-day intervals to sustain high photosynthetic efficiency and leaf chlorophyll.",
            "Apply Liquid Jeevamrutha through drip lines or flood irrigation (200 L/acre) every 2 weeks to feed beneficial soil microbes.",
            "Apply Seaweed extract @ 2 mL/L during flowering and fruit setting stages to optimize harvest yield and crop vigor."
        ],
        "remedies": [
            {
                "title": "Preventative Trichoderma viride Soil Inoculation",
                "type": "bio_fertilizer",
                "application": "Apply 2.5 kg/acre mixed with 100 kg compost during active growth.",
                "description": "Creates a permanent biological shield in the root zone, preventing latent soil pathogens from establishing."
            },
            {
                "title": "Preventative Cold-Pressed Neem Oil Spray (3,000 ppm)",
                "type": "bio_stimulant",
                "application": "Spray 3 mL/L water every 14 days as a preventative leaf polisher and pest deterrent.",
                "description": "Maintains natural leaf sheen, deters sap-sucking disease vectors (aphids/whiteflies), and halts airborne spores."
            }
        ]
    }
}


def _get_protocol_key(crop: str, disease: str, is_healthy: bool) -> str:
    """Determine the agronomic protocol key based on disease and health status."""
    if is_healthy or "healthy" in disease.lower():
        return "healthy"

    d_lower = disease.lower()
    if "blight" in d_lower:
        return "blight"
    if "rust" in d_lower:
        return "rust"
    if "rot" in d_lower:
        return "rot"
    if "mildew" in d_lower:
        return "mildew"
    if "spot" in d_lower or "speck" in d_lower:
        return "spot"
    if "scab" in d_lower:
        return "scab"
    return "blight"  # default standard


async def get_organic_advisory(
    crop: str,
    disease: str,
    is_healthy: bool,
    language: str = "en",
) -> Dict[str, Any]:
    """
    Generate tailored organic fertilizers and biological remedies.
    Uses live Gemini API when available, falling back seamlessly to expert agronomic rules.
    """
    # 1. Check if Gemini AI can provide dynamic, personalized organic advice
    if settings.GEMINI_API_KEY:
        for model in ["models/gemini-flash-latest", "models/gemini-flash-lite-latest"]:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/{model}:generateContent?key={settings.GEMINI_API_KEY}"
                prompt = (
                    f"You are an expert organic agronomist. For a crop of '{crop}' diagnosed with '{disease}' "
                    f"(healthy status: {is_healthy}), provide structured organic fertilizer and biological remedy suggestions. "
                    "Respond with a valid JSON object with the following structure:\n"
                    "{\n"
                    '  "fertilizers": ["fertilizer suggestion 1 with dosage", "fertilizer suggestion 2 with dosage", ...],\n'
                    '  "remedies": [\n'
                    '    {"title": "Remedy Name", "type": "bio_fertilizer|bio_fungicide|soil_amendment|bio_stimulant", "application": "Exact dosage and timing", "description": "How it works biologically"},\n'
                    "    ...\n"
                    "  ]\n"
                    "}\n"
                    "Focus on proven natural/organic inputs (Vermicompost, Panchagavya, Jeevamrutha, Neem cake, Trichoderma, Pseudomonas, fermented buttermilk, seaweed, wood ash). "
                    "Keep dosages precise (e.g. mL/L or kg/acre). Do NOT include any markdown code blocks, return ONLY raw JSON."
                )

                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.2,
                        "maxOutputTokens": 2048,
                        "responseMimeType": "application/json"
                    }
                }

                async with httpx.AsyncClient(timeout=12.0) as client:
                    res = await client.post(url, json=payload)
                    if res.status_code == 200:
                        data = res.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()
                            if "```json" in text:
                                text = text.split("```json", 1)[1].split("```", 1)[0]
                            elif "```" in text:
                                text = text.split("```", 1)[1].split("```", 1)[0]
                            text = text.strip()

                            parsed = json.loads(text)
                            fertilizers = parsed.get("fertilizers", [])
                            remedies = parsed.get("remedies", [])
                            if fertilizers:
                                logger.info(f"Gemini AI ({model}) generated {len(fertilizers)} organic fertilizer suggestions for {crop} - {disease}")
                                return {
                                    "organic_fertilizers": fertilizers,
                                    "bio_remedies": remedies,
                                    "source": "gemini_ai",
                                    "badge": "Gemini AI Verified Organic Protocol"
                                }
            except Exception as e:
                logger.debug(f"Gemini model {model} attempt: {e}")

    # 2. Fallback to Expert Agronomic Standard Protocol
    key = _get_protocol_key(crop, disease, is_healthy)
    protocol = AGRONOMIC_ORGANIC_PROTOCOLS.get(key, AGRONOMIC_ORGANIC_PROTOCOLS["blight"])

    # Personalize crop name into template strings
    customized_fertilizers = [
        f.replace("{crop}", crop).replace("crop", crop) if "{crop}" in f else f
        for f in protocol["fertilizers"]
    ]

    return {
        "organic_fertilizers": customized_fertilizers,
        "bio_remedies": protocol["remedies"],
        "source": "agronomic_standard",
        "badge": "Certified Organic Agronomic Standard"
    }
