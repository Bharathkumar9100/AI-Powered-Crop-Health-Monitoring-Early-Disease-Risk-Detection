"""AI Chat Assistant Service for PhytoVision-X Enterprise.

Provides deep agricultural reasoning, disease diagnosis, fungicide dosages,
organic bio-remedies, IPM protocols, and multilingual responses.
Integrates Google Gemini with instant high-accuracy agronomic offline fallback.
"""

import json
import re
from typing import Optional, List, Dict, Any, Tuple
import httpx

from app.config import settings

# ==============================================================================
# 1. COMPREHENSIVE EXPERT AGRONOMIC KNOWLEDGE BASE (38 PlantVillage + IPM + Bio)
# ==============================================================================

DISEASE_KNOWLEDGE: Dict[str, Dict[str, Any]] = {
    "early_blight": {
        "name": "Early Blight (Alternaria solani)",
        "crops": ["Tomato", "Potato", "Eggplant"],
        "symptoms": "Dark brown to black concentric circular rings ('bullseye' or target-board pattern) primarily on older, lower foliage. Surrounding tissue turns chlorotic yellow, leading to severe defoliation and sunken stem lesions.",
        "chemical_control": (
            "• Mancozeb 75 WP @ 2.5 g/L water (protective multisite contact fungicide)\n"
            "• Azoxystrobin 23 SC @ 1.0 mL/L water or Difenoconazole 25 EC @ 0.5 mL/L (systemic curative)\n"
            "• Chlorothalonil 75 WP @ 2.0 g/L water on 7-10 day spray cycle during cloudy/humid weather"
        ),
        "organic_remedies": (
            "• Spray Trichoderma viride (2x10^8 CFU/g) @ 5 g/L with 0.1% surfactant in the late afternoon\n"
            "• Foliar application of Copper Hydroxide 53.8% DF @ 2.0 g/L or Bordeaux Mixture (1%)\n"
            "• Cold-pressed Neem oil (10,000 ppm) @ 4 mL/L + 1 mL bio-soap emulsifier"
        ),
        "cultural_practices": (
            "• Prune and remove lower 30 cm canopy leaves touching wet soil\n"
            "• Transition from overhead sprinklers to drip irrigation to keep foliage dry\n"
            "• Maintain 60 cm intra-row ventilation spacing and apply organic straw mulch\n"
            "• Enforce strict 3-year non-solanaceous crop rotation (rotate with pulses or maize)"
        ),
        "dosage_summary": "Mancozeb @ 2.5 g/L or Azoxystrobin @ 1 mL/L; Neem oil @ 4-5 mL/L.",
        "phi": "Pre-Harvest Interval (PHI): 7 days for Mancozeb; 3 days for Azoxystrobin."
    },
    "late_blight": {
        "name": "Late Blight (Phytophthora infestans)",
        "crops": ["Potato", "Tomato"],
        "symptoms": "Rapidly expanding water-soaked irregular lesions on leaves and petioles that turn dark brown to purplish-black. In humid or dewy mornings, a delicate white cottony fungal down appears on the underside of leaves. Stems exhibit greasy lesions.",
        "chemical_control": (
            "• Emergency Curative: Metalaxyl 8% + Mancozeb 64% WP (Ridomil MZ) @ 2.5 g/L water\n"
            "• Cymoxanil 8% + Mancozeb 64% WP @ 2.5 g/L or Dimethomorph 50 WP @ 1.0 g/L\n"
            "• Preventative: Mancozeb 75 WP @ 2.5 g/L before wet weather spells (Temp: 12-22°C, RH >85%)"
        ),
        "organic_remedies": (
            "• Bordeaux Mixture (1% w/v) foliar spray @ 10 g Copper Sulfate + 10 g Quicklime per 1 L water\n"
            "• Bacillus subtilis (strain QST 713) @ 5 g/L every 5-7 days\n"
            "• Drench soil with Liquid Jeevamrutha @ 200 L/acre to enrich beneficial antagonistic microbes"
        ),
        "cultural_practices": (
            "• Destroy cull piles and volunteer potato plants which act as primary inoculum reservoirs\n"
            "• In potatoes, hill soil well (minimum 10-15 cm ridge depth) to shield tubers from washed spores\n"
            "• Harvest only after vines are completely dead or killed with desiccant for at least 14 days"
        ),
        "dosage_summary": "Metalaxyl+Mancozeb @ 2.5 g/L; Dimethomorph @ 1 g/L; Bordeaux Mixture 1%.",
        "phi": "Pre-Harvest Interval (PHI): 7 days for Metalaxyl+Mancozeb; 14 days for potatoes."
    },
    "powdery_mildew": {
        "name": "Powdery Mildew (Podosphaera / Erysiphe / Leveillula spp.)",
        "crops": ["Squash", "Cucumber", "Cherry", "Grape", "Apple", "Tomato", "Chili"],
        "symptoms": "White to grayish-white powdery talcum-like fungal patches on the upper surface of leaves, petioles, and young stems. Infected leaves turn chlorotic, curl upwards, become brittle, and dry up prematurely.",
        "chemical_control": (
            "• Wettable Sulfur 80 WP @ 2.5 g/L water (do not apply if temperature exceeds 32°C)\n"
            "• Hexaconazole 5 EC @ 1.0 mL/L water or Penconazole 10 EC @ 0.5 mL/L\n"
            "• Myclobutanil 10 WP @ 1.0 g/L or Azoxystrobin 23 SC @ 1.0 mL/L"
        ),
        "organic_remedies": (
            "• Potassium Bicarbonate or Sodium Bicarbonate (Baking Soda) @ 3.0 g/L + 3 mL Neem oil\n"
            "• Fresh cow milk spray diluted 1:9 (10% milk in water); solar UV activates antiseptic lactoferrin\n"
            "• Cold-pressed Neem oil (10,000 ppm) @ 4 mL/L with organic soap surfactant"
        ),
        "cultural_practices": (
            "• Prune excessive dense canopy shoots to maximize sunlight penetration and airflow\n"
            "• Avoid excessive synthetic nitrogen fertilization which fosters tender susceptible succulent tissue\n"
            "• Water early in the day around the base; powdery mildew thrives in dry canopy with high ambient humidity"
        ),
        "dosage_summary": "Wettable Sulfur @ 2.5 g/L; Hexaconazole @ 1 mL/L; Baking soda @ 3 g/L.",
        "phi": "PHI: Sulfur 1 day; Hexaconazole 7 days."
    },
    "downy_mildew": {
        "name": "Downy Mildew (Pseudoperonospora / Plasmopara viticola)",
        "crops": ["Grape", "Squash", "Cucumber", "Melon", "Cabbage"],
        "symptoms": "Angular yellow/chlorotic 'oil spots' strictly delimited by leaf veins on the upper leaf surface. Underneath, a dense grayish-purple to white downy velvety growth forms in humid morning conditions.",
        "chemical_control": (
            "• Metalaxyl 8% + Mancozeb 64% WP @ 2.5 g/L water\n"
            "• Dimethomorph 50 WP @ 1.0 g/L or Fosetyl-Al 80 WP @ 2.0 g/L\n"
            "• Copper Oxychloride 50 WP @ 2.5 g/L"
        ),
        "organic_remedies": (
            "• Bordeaux Mixture (1%) applied protectively before rain fronts\n"
            "• Foliar spray of Trichoderma harzianum @ 5 g/L + fermented whey/buttermilk @ 30 mL/L\n"
            "• Panchagavya 3% foliar spray (30 mL/L) to enhance leaf cuticular wax immunity"
        ),
        "cultural_practices": (
            "• Trellis vines high to keep canopy away from ground splash\n"
            "• Eliminate water stagnation in furrows; ensure rapid surface drainage\n"
            "• Remove and burn fallen infected leaves during dormant seasons"
        ),
        "dosage_summary": "Dimethomorph @ 1 g/L; Copper Oxychloride @ 2.5 g/L.",
        "phi": "PHI: Dimethomorph 7 days; Copper 3 days."
    },
    "leaf_curl_virus": {
        "name": "Tomato Yellow Leaf Curl Virus (TYLCV) & Chili Leaf Curl",
        "crops": ["Tomato", "Chili", "Pepper", "Papaya"],
        "symptoms": "Upward curling and cupping of leaflets, marked reduction in leaf size, yellowing/chlorosis of leaf margins, thick leathery texture, severe plant stunting, and near total flower abortion.",
        "chemical_control": (
            "• Vector Management (Silverleaf Whitefly & Thrips):\n"
            "• Imidacloprid 17.8 SL @ 0.5 mL/L water or Thiamethoxam 25 WG @ 0.3 g/L\n"
            "• Acetamiprid 20 SP @ 0.5 g/L or Spiromesifen 22.9 SC @ 1.0 mL/L"
        ),
        "organic_remedies": (
            "• Install 20 Yellow Sticky Traps per acre at canopy height to mass-trap whiteflies\n"
            "• Spray cold-pressed Neem oil (10,000 ppm) @ 5 mL/L + 1 mL liquid soap every 5 days\n"
            "• 5% Neem Seed Kernel Extract (NSKE) or Agniastra botanical extract @ 20 mL/L\n"
            "• Beauveria bassiana (entomopathogenic fungus) @ 5 g/L to parasitize whitefly nymphs"
        ),
        "cultural_practices": (
            "• Rogue out and incinerate infected symptomatic virus plants immediately (virus cannot be cured)\n"
            "• Grow 2-3 border rows of tall barrier crops like maize, sorghum, or pearl millet 30 days prior\n"
            "• Use 40-50 mesh insect-proof netting in nursery beds\n"
            "• Silver or reflective plastic mulch repels incoming whiteflies significantly"
        ),
        "dosage_summary": "Imidacloprid @ 0.5 mL/L; Thiamethoxam @ 0.3 g/L; Neem oil @ 5 mL/L.",
        "phi": "PHI: Imidacloprid 7 days; Neem oil 0 days."
    },
    "bacterial_spot": {
        "name": "Bacterial Leaf Spot (Xanthomonas campestris / perforans)",
        "crops": ["Tomato", "Pepper", "Peach"],
        "symptoms": "Small, water-soaked dark brown to black circular lesions (<3 mm) often with a greasy appearance and conspicuous yellow halo. On fruit, raised blister-like rough scabby warts appear. Lesions coalesce causing severe blight.",
        "chemical_control": (
            "• Copper Oxychloride 50 WP @ 2.5 g/L tank-mixed with Streptocycline (Streptomycin + Tetracycline) @ 0.5 g per 10 L water\n"
            "• Copper Hydroxide 53.8% DF @ 2.0 g/L\n"
            "• Kasugamycin 3% SL @ 2.0 mL/L water"
        ),
        "organic_remedies": (
            "• Foliar spray of Pseudomonas fluorescens (10^8 CFU/g) @ 5 g/L\n"
            "• Fresh cow urine (Gomutra) diluted 1:10 with water as a natural antibacterial foliar spray\n"
            "• Seed treatment: Hot water soaking at 50°C for 25 minutes prior to sowing"
        ),
        "cultural_practices": (
            "• Strictly avoid entering or working in crop fields when foliage is wet from dew or rain\n"
            "• Disinfect pruning shears and trellising tools with 70% isopropyl alcohol or 10% bleach\n"
            "• Only sow certified pathogen-free seeds from trusted agronomic agencies"
        ),
        "dosage_summary": "Copper Oxychloride @ 2.5 g/L + Streptocycline @ 0.5 g/10 L.",
        "phi": "PHI: Copper 3 days; Streptocycline 14 days."
    },
    "apple_scab": {
        "name": "Apple Scab (Venturia inaequalis)",
        "crops": ["Apple", "Pear"],
        "symptoms": "Olive-green, velvety to brown spots with feathery indistinct margins on young leaves. On fruit, lesions turn corky, dark brown to black, scabby, causing fruit distortion and severe cracking.",
        "chemical_control": (
            "• Difenoconazole 25 EC @ 0.5 mL/L water or Hexaconazole 5 EC @ 1.0 mL/L\n"
            "• Captan 50 WP @ 2.5 g/L or Dodine 65 WP @ 1.0 g/L applied at green-tip to petal-fall stages\n"
            "• Mancozeb 75 WP @ 2.5 g/L for protective pre-infection cover"
        ),
        "organic_remedies": (
            "• Lime sulfur @ 3-5 mL/L during delayed dormant bud break\n"
            "• Potassium Bicarbonate @ 3 g/L during active bloom periods\n"
            "• Spray Bacillus subtilis @ 5 g/L"
        ),
        "cultural_practices": (
            "• Thoroughly chop or clear fallen orchard leaf litter in autumn; spray 5% urea on orchard floor to accelerate leaf decomposition and eliminate overwintering pseudothecia\n"
            "• Prune canopies in winter to foster rapid leaf drying"
        ),
        "dosage_summary": "Difenoconazole @ 0.5 mL/L; Captan @ 2.5 g/L.",
        "phi": "PHI: Difenoconazole 14 days; Captan 14 days."
    },
    "grape_black_rot": {
        "name": "Grape Black Rot (Guignardia bidwellii) & Esca",
        "crops": ["Grape"],
        "symptoms": "Leaves develop circular reddish-brown spots with prominent dark borders and tiny black pimple-like pycnidia. Developing berries turn brown, soften, shrivel into hard, black, wrinkled 'mummies' that cling to clusters.",
        "chemical_control": (
            "• Mancozeb 75 WP @ 2.5 g/L or Myclobutanil 10 WP @ 1.0 g/L\n"
            "• Azoxystrobin 23 SC @ 1.0 mL/L or Difenoconazole @ 0.5 mL/L\n"
            "• Apply at 10-14 day intervals from bud break through 4 weeks post-bloom"
        ),
        "organic_remedies": (
            "• Copper Hydroxide @ 2.0 g/L or Bordeaux Mixture (1%)\n"
            "• Prune and burn all desiccated mummified grape clusters from previous season\n"
            "• Bio-protectant spray of Trichoderma harzianum @ 5 g/L"
        ),
        "cultural_practices": (
            "• Canopy management: shoot positioning and leaf removal around fruit clusters to speed drying\n"
            "• Flail mow or cultivate vineyard floor to bury fallen infected berry mummies"
        ),
        "dosage_summary": "Mancozeb @ 2.5 g/L; Myclobutanil @ 1 g/L.",
        "phi": "PHI: Mancozeb 66 days in grapes; Myclobutanil 14 days."
    },
    "citrus_greening": {
        "name": "Huanglongbing (HLB / Citrus Greening) & Citrus Canker",
        "crops": ["Orange", "Lemon", "Lime", "Citrus"],
        "symptoms": "HLB: Asymmetric yellow mottling across leaf veins ('blotchy mottle'), upright twiggy growth, vein corking, premature fruit drop, small lopsided misshapen fruit with bitter taste and seeds aborted. Canker: Raised corky pustules with oily yellow halos.",
        "chemical_control": (
            "• Vector Management (Asian Citrus Psyllid - Diaphorina citri):\n"
            "• Thiamethoxam 25 WG @ 0.3 g/L or Imidacloprid 17.8 SL @ 0.5 mL/L\n"
            "• For Canker: Copper Oxychloride 50 WP @ 3.0 g/L + Streptocycline 1 g/10 L"
        ),
        "organic_remedies": (
            "• High-volume botanical insecticidal soap + cold-pressed Neem oil @ 5 mL/L\n"
            "• Parasitic wasp release: Tamarixia radiata bio-control against psyllid nymphs\n"
            "• Intensive foliar nutrition program: Zinc Sulfate (0.5%) + Manganese Sulfate (0.5%) + Iron Chelates to counteract vascular decline"
        ),
        "cultural_practices": (
            "• Source trees exclusively from certified disease-free screenhouse budwood nurseries\n"
            "• Scout orchard with yellow sticky boards; immediately remove heavily diseased trees\n"
            "• Maintain windbreaks to reduce windblown vector dispersion and canker bacteria entry"
        ),
        "dosage_summary": "Thiamethoxam @ 0.3 g/L; Copper Oxychloride @ 3 g/L + Streptocycline.",
        "phi": "PHI: Thiamethoxam 14 days."
    },
    "spider_mites": {
        "name": "Two-Spotted Spider Mites (Tetranychus urticae)",
        "crops": ["Tomato", "Chili", "Eggplant", "Cotton", "Beans", "Strawberry"],
        "symptoms": "Minute yellow or white stippling specks on the upper leaf surface. As infestation grows, leaves take on a bronzed or bleached appearance. Fine silky webbing forms on the undersides of leaves and growing tips; leaves dry out and drop.",
        "chemical_control": (
            "• Propargite 57 EC @ 2.0 mL/L water or Fenazaquin 10 EC @ 2.0 mL/L\n"
            "• Spiromesifen 22.9 SC @ 1.0 mL/L water (acts on mite eggs and nymphs)\n"
            "• Abamectin 1.8 EC @ 0.5 mL/L water"
        ),
        "organic_remedies": (
            "• Wettable Sulfur 80 WP @ 2.5 g/L water (excellent dual acaricide/fungicide)\n"
            "• Cold-pressed Neem oil (10,000 ppm) @ 5 mL/L + 1 mL bio-soap emulsifier\n"
            "• High-pressure overhead water spray aimed at leaf undersides to dislodge colonies\n"
            "• Release predatory mites (Phytoseiulus persimilis or Neoseiulus californicus)"
        ),
        "cultural_practices": (
            "• Eliminate dusty conditions; road dust on leaves creates mite flare-ups by desiccating predators\n"
            "• Avoid broad-spectrum synthetic pyrethroids which kill beneficial predatory insects\n"
            "• Ensure adequate irrigation; drought-stressed plants are preferred mite hosts"
        ),
        "dosage_summary": "Spiromesifen @ 1 mL/L; Wettable Sulfur @ 2.5 g/L; Neem oil @ 5 mL/L.",
        "phi": "PHI: Spiromesifen 3 days; Sulfur 1 day."
    },
    "rust": {
        "name": "Cereal & Legume Rust (Puccinia / Uromyces spp.)",
        "crops": ["Corn", "Wheat", "Soybean", "Beans", "Apple"],
        "symptoms": "Raised powdery pustules (uredinia) that rupture the leaf epidermis, releasing millions of reddish-brown, golden-yellow, or cinnamon spores on upper and lower leaf surfaces. Heavy infection causes severe lodging and shriveled grain.",
        "chemical_control": (
            "• Propiconazole 25 EC @ 1.0 mL/L water or Tebuconazole 250 EC @ 1.0 mL/L\n"
            "• Azoxystrobin 18.2% + Difenoconazole 11.4% SC @ 1.0 mL/L water\n"
            "• Mancozeb 75 WP @ 2.5 g/L as early preventative"
        ),
        "organic_remedies": (
            "• Foliar spray of Trichoderma harzianum @ 5 g/L + 0.1% bio-sticker\n"
            "• Fermented butter-milk (sour curd) @ 30 mL/L mixed with 2 g Asafoetida (Hing) in water\n"
            "• Sulfur 80 WP @ 2.5 g/L"
        ),
        "cultural_practices": (
            "• Plant resistant crop varieties and hybrids suited for local rust pathotypes\n"
            "• Spray when wind speed is <10 km/h early in the morning before spore wind dispersal\n"
            "• Eradicate alternate host plants near field perimeters (e.g., barberry for stem rust)"
        ),
        "dosage_summary": "Propiconazole @ 1 mL/L; Tebuconazole @ 1 mL/L; Mancozeb @ 2.5 g/L.",
        "phi": "PHI: Propiconazole 30 days in cereals; 14 days in vegetables."
    },
    "root_rot": {
        "name": "Root Rot & Damping-Off (Pythium / Rhizoctonia / Fusarium)",
        "crops": ["All Seedlings", "Tomato", "Chili", "Cotton", "Legumes"],
        "symptoms": "Seedlings rot before emergence or stems become water-soaked and constricted at soil line ('damping off'), collapsing suddenly. Mature crops display yellowing, progressive wilting, and dark brown, decayed, disintegrating taproots with peeled cortex.",
        "chemical_control": (
            "• Soil Drenching: Carbendazim 50 WP @ 1.5 g/L or Metalaxyl 35 WS @ 2.0 g/L water\n"
            "• Copper Oxychloride 50 WP @ 3.0 g/L (500 mL solution drenched per plant crown)\n"
            "• Seed Treatment: Thiram 75 WP @ 3 g/kg seed or Carbendazim 2 g/kg seed"
        ),
        "organic_remedies": (
            "• Enrich 500 kg Vermicompost with 2.5 kg Trichoderma viride + 2.5 kg Pseudomonas fluorescens, incubate 7 days, incorporate into furrows\n"
            "• Soil solarization with 25-micron transparent polyethylene sheets for 4-6 weeks in summer\n"
            "• Drench with Liquid Jeevamrutha @ 200 L/acre"
        ),
        "cultural_practices": (
            "• Provide high raised beds (15-20 cm) in heavy clay soils to eliminate waterlogging\n"
            "• Cease over-irrigation; allow soil surface to dry between watering intervals\n"
            "• Disinfect seedling nursery trays and use sterilized coco peat / potting media"
        ),
        "dosage_summary": "Carbendazim @ 1.5 g/L; Copper Oxychloride @ 3 g/L; Trichoderma @ 10 g/L drench.",
        "phi": "PHI: Carbendazim 14 days."
    },
    "blossom_end_rot": {
        "name": "Blossom End Rot (Calcium Deficiency & Irregular Water)",
        "crops": ["Tomato", "Pepper", "Eggplant", "Watermelon"],
        "symptoms": "Water-soaked spot at the blossom end (bottom tip) of developing green fruit. Spot darkens and enlarges into a flat, sunken, leathery black or dark brown dry patch. Non-pathogenic; caused by localized calcium deficiency under fluctuating moisture.",
        "chemical_control": (
            "• Foliar spray of Calcium Nitrate @ 5.0 g/L water during fruit set, repeated every 7-10 days\n"
            "• Chelated Calcium (EDTA-Ca) @ 1.5-2.0 g/L foliar spray for rapid tissue absorption"
        ),
        "organic_remedies": (
            "• Soil incorporation of Agricultural Gypsum (Calcium Sulfate) @ 100 kg/acre or Dolomitic Lime\n"
            "• Eggshell extract: Dissolve powdered eggshells in vinegar (1:10 ratio) for 7 days, dilute @ 10 mL/L\n"
            "• Apply Vermicompost @ 500 kg/acre to bolster soil moisture-holding capacity"
        ),
        "cultural_practices": (
            "• Maintain consistent, uniform soil moisture with drip irrigation (avoid dry-wet cycles)\n"
            "• Apply 7-10 cm layer of organic straw or plastic mulch to stabilize root zone moisture\n"
            "• Avoid excessive ammonium-based nitrogen fertilizer, which competes with calcium uptake\n"
            "• Do not cultivate deeply near root zones, which severs active calcium-absorbing root hairs"
        ),
        "dosage_summary": "Calcium Nitrate @ 5 g/L foliar; Gypsum @ 100 kg/acre soil.",
        "phi": "Nutritional amendment — 0 days PHI."
    },
    "aphids_whiteflies": {
        "name": "Sucking Pests: Aphids, Whiteflies & Thrips",
        "crops": ["All Vegetables", "Cotton", "Pulses", "Fruits"],
        "symptoms": "Leaves curled downwards, yellowing, distorted terminal buds, sticky glistening honeydew secreted on leaves followed by black sooty mold fungus. Vector of serious viral diseases.",
        "chemical_control": (
            "• Imidacloprid 17.8 SL @ 0.5 mL/L water or Acetamiprid 20 SP @ 0.5 g/L\n"
            "• Thiamethoxam 25 WG @ 0.3 g/L or Flonicamid 50 WG @ 0.3 g/L\n"
            "• For Thrips: Fipronil 5 SC @ 1.5 mL/L or Spinosad 45 SC @ 0.3 mL/L"
        ),
        "organic_remedies": (
            "• Yellow sticky traps (for aphids & whiteflies) and Blue sticky traps (for thrips) @ 15-20 traps/acre\n"
            "• Cold-pressed Neem oil (10,000 ppm) @ 5 mL/L with 1 mL bio-detergent\n"
            "• Verticillium lecanii or Beauveria bassiana @ 5 g/L foliar bio-insecticide\n"
            "• Spray Dashparni Ark @ 25 mL/L or 5% Neem Seed Kernel Extract (NSKE)"
        ),
        "cultural_practices": (
            "• Conserve natural predators: ladybird beetles, lacewings, syrphid fly larvae\n"
            "• Use silver reflective mulches in furrows to disorient landing winged insects\n"
            "• Keep field borders weed-free to prevent pest bridge hosts"
        ),
        "dosage_summary": "Imidacloprid @ 0.5 mL/L; Acetamiprid @ 0.5 g/L; Neem oil @ 5 mL/L.",
        "phi": "PHI: Imidacloprid 7 days; Acetamiprid 3 days; Neem oil 0 days."
    }
}

# ==============================================================================
# 2. ORGANIC PREPARATION FORMULAS & RECIPES
# ==============================================================================

ORGANIC_PREPARATIONS: Dict[str, str] = {
    "jeevamrutha": (
        "🌿 Liquid Jeevamrutha Preparation Protocol (for 1 Acre):\n"
        "• Ingredients: 10 kg fresh indigenous cow dung + 10 L indigenous cow urine + 2 kg jaggery (gur) + 2 kg pulse flour (besan) + 1 handful fertile bund soil + 200 L chlorine-free water.\n"
        "• Preparation: Mix thoroughly in a 200 L barrel placed in the shade. Stir clockwise twice daily with a wooden stick for 5 minutes. Cover with a breathable burlap gunny bag.\n"
        "• Fermentation: Ready in 48 to 72 hours (use within 7 days of fermentation).\n"
        "• Application: Drench around plant root zones or inject into drip irrigation system @ 200 L/acre every 14 days. Multiplies beneficial soil bacteria, mycorrhizae, and nutrient solubilizers."
    ),
    "panchagavya": (
        "🌱 Panchagavya Formulation Protocol (Master Growth Promoter & Immunity Booster):\n"
        "• Step 1: Mix 5 kg fresh cow dung + 500 g pure cow ghee in a container. Rest for 3 days, stirring twice daily.\n"
        "• Step 2: On Day 4, add 5 L cow urine + 2 L cow milk + 2 L sour cow curd + 500 g jaggery dissolved in 3 L tender coconut water + 12 ripe mashed bananas + 10 L water.\n"
        "• Step 3: Stir twice daily for 21 days in the shade under gunny cloth.\n"
        "• Application: Filter through fine muslin. Spray as a 3% foliar solution (30 mL Panchagavya per 1 Liter water) at 15-day intervals. Promotes chlorophyll density, branching, and systemic acquired resistance (SAR)."
    ),
    "neem_oil": (
        "🍃 Cold-Pressed Neem Oil Emulsion (Natural Broad-Spectrum Bio-Pesticide):\n"
        "• Dosage: 4 to 5 mL cold-pressed Neem oil (standardized to 10,000 ppm Azadirachtin) per 1 Liter of water.\n"
        "• Emulsification Rule: Neem oil does not dissolve in water alone. Always mix 5 mL Neem oil with 1 mL mild liquid soap or baby shampoo in a small cup until it turns milky white, then dilute into the water tank.\n"
        "• Application Window: Spray during late afternoon (after 4:30 PM) to avoid UV photodegradation and leaf sun scorch. Safe for pollinators when sprayed in the evening."
    ),
    "trichoderma": (
        "🍄 Trichoderma viride / harzianum (Bio-Fungicide Protocol):\n"
        "• Foliar Spray: 5 g wettable powder (2x10^8 CFU/g) per 1 Liter of water with 0.1% sticker.\n"
        "• Soil Enrichment: Mix 2.5 kg Trichoderma with 500 kg moist vermicompost/FYM. Cover with burlap sack for 7 days in shade until white fungal mycelium develops. Broadcast across 1 acre before planting.\n"
        "• Mode of Action: Hyper-parasitizes pathogenic fungal cell walls (Rhizoctonia, Pythium, Fusarium, Sclerotium)."
    ),
    "vermicompost": (
        "🪱 Vermicompost Application Guideline:\n"
        "• Dosage: 400 to 500 kg per acre for vegetables; 5 to 10 kg per tree for fruit orchards.\n"
        "• Enrichment: Mix with 1 kg Azotobacter + 1 kg PSB (Phosphorus Solubilizing Bacteria) + 1 kg Trichoderma per ton.\n"
        "• Benefits: Increases soil cation exchange capacity (CEC), regulates pH, and retains moisture during dry spells."
    )
}

# ==============================================================================
# 3. MULTILINGUAL RESPONSES (HI, TA, TE, ML, EN)
# ==============================================================================

MULTILINGUAL_GREETINGS = {
    "en": "Hello! I am your PhytoVision-X Agricultural Assistant. Ask me anything about crop diseases (Early Blight, Late Blight, Powdery Mildew, Rust, Leaf Curl, Scab), exact chemical dosages (Mancozeb, Azoxystrobin, Copper), organic remedies (Jeevamrutha, Neem oil, Trichoderma), or satellite NDVI interpretations.",
    "hi": "नमस्ते! मैं आपका फाइटोविज़न-एक्स कृषि विशेषज्ञ सहायक हूँ। आप मुझसे फसलों के रोग (झुलसा, रतुआ, चूर्णिल आसिता, मरोड़िया रोग), कीटनाशक व कवकनाशी की सही खुराक (मैन्कोज़ेब, कॉपर), या जैविक उपचार (जीवामृत, पंचगव्य, नीम तेल) के बारे में पूछ सकते हैं।",
    "ta": "வணக்கம்! நான் உங்கள் பைட்டோவிஷன்-எக்ஸ் வேளாண் ஆலோசகர். பயிர் நோய்கள் (இலைக்கருகல், துரு நோய், சாம்பல் நோய், இலைச்சுருட்டு), பூஞ்சாணக் கொல்லி மருந்தளவு (Mancozeb, Copper) மற்றும் இயற்கை வேளாண்மை (ஜீவாமிர்தம், பஞ்சகாவ்யா, வேப்பெண்ணெய்) பற்றி கேட்கலாம்.",
    "te": "నమస్కారం! నేను మీ ఫైటోవిజన్-ఎక్స్ వ్యవసాయ సలహాదారుని. పంట తెగుళ్లు (ఆకుమచ్చ, తుప్పు తెగులు, బూడిద తెగులు, ఆకుముడుత), మందుల సరైన మోతాదు (Mancozeb, Copper) మరియు సేంద్రియ పద్ధతులు (జీవామృతం, వేపనూనె) పై సందేహాలను అడగండి.",
    "ml": "നമസ്കാരം! ഞാൻ നിങ്ങളുടെ ഫൈറ്റോവിഷൻ-എക്സ് കാർഷിക സഹായിയാണ്. വിള രോഗങ്ങൾ (കരിഞ്ഞുണങ്ങൽ, ഇലപ്പുള്ളി, പൂപ്പൽ ബാധ), കുമിൾനാശിനി അളവുകൾ, ജൈവ കീടനിയന്ത്രണം (ജീവാമൃതം, വേപ്പെണ്ണ) എന്നിവയെക്കുറിച്ച് ചോദിക്കാം."
}

# ==============================================================================
# 4. QUERY REASONING & NLP INTENT EXTRACTION
# ==============================================================================

def _normalize_query(text: str) -> str:
    """Normalize text, fix common agricultural spelling variants and typos."""
    t = text.lower()
    # Normalize common typos
    typos = {
        "dissease": "disease", "desease": "disease", "dieseas": "disease", "desiese": "disease",
        "bligt": "blight", "blite": "blight", "erly": "early",
        "mildeww": "mildew", "powdry": "powdery", "downey": "downy",
        "curll": "curl", "curling": "curl", "curled": "curl",
        "tometo": "tomato", "tamato": "tomato", "potao": "potato", "patato": "potato",
        "fongus": "fungus", "fungicide": "fungicide", "fungal": "fungus",
        "pescticide": "pesticide", "insec": "insect", "insects": "insect",
        "wilt": "wilt", "wilting": "wilt",
        "neem": "neem", "nim": "neem", "oil": "oil",
        "mancozb": "mancozeb", "mancozeb": "mancozeb",
        "jeevamrut": "jeevamrutha", "jeevamrutha": "jeevamrutha", "jeewamrut": "jeevamrutha",
        "panchgavya": "panchagavya", "panchagavya": "panchagavya",
    }
    for typo, correction in typos.items():
        t = re.sub(rf"\b{typo}\b", correction, t)
    return t


def _match_disease(query: str) -> Optional[str]:
    """Score and find the most relevant disease from user query."""
    q = _normalize_query(query)

    # Specific multi-word patterns first
    if "early blight" in q or ("early" in q and "blight" in q):
        return "early_blight"
    if "late blight" in q or ("late" in q and "blight" in q):
        return "late_blight"
    if "powdery" in q or "powdery mildew" in q:
        return "powdery_mildew"
    if "downy" in q or "downy mildew" in q:
        return "downy_mildew"
    if "curl" in q or "tylcv" in q or "leaf curl" in q or "curling" in q:
        return "leaf_curl_virus"
    if "bacterial spot" in q or ("bacterial" in q and "spot" in q):
        return "bacterial_spot"
    if "scab" in q or "apple scab" in q:
        return "apple_scab"
    if "black rot" in q or "esca" in q or "measles" in q:
        return "grape_black_rot"
    if "greening" in q or "hlb" in q or "canker" in q or "huanglongbing" in q:
        return "citrus_greening"
    if "spider mite" in q or "mite" in q or "mites" in q:
        return "spider_mites"
    if "rust" in q:
        return "rust"
    if "root rot" in q or "damping" in q or "wilt" in q or "fusarium" in q or "pythium" in q:
        return "root_rot"
    if "blossom end rot" in q or "bottom rot" in q or ("calcium" in q and "rot" in q):
        return "blossom_end_rot"
    if "aphid" in q or "aphids" in q or "whitefly" in q or "whiteflies" in q or "thrip" in q or "thrips" in q:
        return "aphids_whiteflies"

    # Single keyword fallbacks
    if "blight" in q:
        if "potato" in q:
            return "late_blight"
        return "early_blight"
    if "mildew" in q:
        return "powdery_mildew"
    if "spot" in q or "spots" in q:
        return "bacterial_spot"
    if "rot" in q:
        return "root_rot"

    return None


def _format_disease_response(d_key: str, crop_hint: Optional[str] = None) -> str:
    """Format a rich agronomic advisory report for a given disease."""
    info = DISEASE_KNOWLEDGE[d_key]
    crop_str = f" for {crop_hint}" if crop_hint else f" (Commonly affects: {', '.join(info['crops'])})"

    return (
        f"🔬 **PhytoVision Agronomic Diagnostic: {info['name']}{crop_str}**\n\n"
        f"**1. Characteristic Symptoms & Pathology:**\n{info['symptoms']}\n\n"
        f"**2. Chemical Treatment & Fungicide Dosage:**\n{info['chemical_control']}\n\n"
        f"**3. Biological & Certified Organic Remedies:**\n{info['organic_remedies']}\n\n"
        f"**4. Preventative Cultural Measures:**\n{info['cultural_practices']}\n\n"
        f"**Quick Dosage Guide:** {info['dosage_summary']}\n"
        f"⚠️ **Safety Directive:** {info['phi']} Always verify local spray window (wind < 12 km/h, rain < 20%)."
    )


# ==============================================================================
# 5. CORE CHAT RESPONSE ORCHESTRATOR
# ==============================================================================

async def get_chat_response(
    message: str,
    language: str = "en",
    context: Optional[dict] = None,
    history: Optional[List[dict]] = None,
) -> Tuple[str, bool]:
    """
    Generate an intelligent AI agricultural response.
    1. Tries Gemini API if key is valid (with quick 5s timeout).
    2. Seamlessly falls back to deep PhytoVision Expert Agronomic Knowledge Base.
    """
    clean_msg = message.strip()
    norm_msg = _normalize_query(clean_msg)

    # --------------------------------------------------------------------------
    # STEP 1: Attempt Gemini API (if key is present and not revoked)
    # --------------------------------------------------------------------------
    if settings.GEMINI_API_KEY and len(settings.GEMINI_API_KEY) > 10:
        for model in ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"]:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={settings.GEMINI_API_KEY}"
                
                prompt_context = ""
                if context:
                    prompt_context = (
                        f"\nContext from recent crop leaf scan:\n"
                        f"- Crop: {context.get('crop', 'Crop')}\n"
                        f"- Diagnosed Disease: {context.get('disease', 'Unknown')}\n"
                        f"- Severity/Risk: {context.get('risk_level', 'moderate')}\n"
                        f"- Recommended bio-fertilizers: {context.get('organic_fertilizers', [])}\n"
                    )

                system_instruction = (
                    "You are PhytoVision-X Enterprise Agricultural Advisor, a master agronomist specializing in crop pathology, "
                    "integrated pest management (IPM), precision agriculture, and organic farming. "
                    "When answering questions about plant diseases or symptoms:\n"
                    "1. Name the causal pathogen (fungal, bacterial, viral).\n"
                    "2. Give precise chemical fungicides/insecticides with exact dosages per liter of water.\n"
                    "3. Provide certified biological and organic alternatives (Trichoderma, Pseudomonas, Neem oil @ 5 mL/L, Jeevamrutha, Panchagavya).\n"
                    "4. Include cultural sanitation practices (pruning, irrigation schedule, crop rotation) and Pre-Harvest Interval (PHI).\n"
                    "Keep answers structured with bullet points, highly practical, and clear for farmers."
                )

                payload = {
                    "contents": [
                        {
                            "parts": [
                                {
                                    "text": (
                                        f"{system_instruction}\n"
                                        f"Target Output Language: {language}\n"
                                        f"{prompt_context}\n"
                                        f"Farmer Query: {clean_msg}"
                                    )
                                }
                            ]
                        }
                    ]
                }

                async with httpx.AsyncClient(timeout=5.0) as client:
                    res = await client.post(url, json=payload)
                    # If key was revoked or forbidden (403 / 401), stop immediately and fall back
                    if res.status_code in [401, 403]:
                        break
                    if res.status_code == 200:
                        data = res.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            content = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                            if content.strip():
                                return content.strip(), False
            except Exception:
                continue

    # --------------------------------------------------------------------------
    # STEP 2: PhytoVision Expert Agronomic Reasoning Engine (High Precision Fallback)
    # --------------------------------------------------------------------------

    # A. Check if the user is greeting or introducing
    if any(re.search(rf"\b{w}\b", norm_msg) for w in ["hi", "hello", "hey", "namaste", "vanakkam", "start", "help", "who are you"]):
        greeting = MULTILINGUAL_GREETINGS.get(language, MULTILINGUAL_GREETINGS["en"])
        return greeting, False

    # B. If scan diagnosis context is provided and user asks for treatment/remedy
    if context and any(w in norm_msg for w in ["treat", "spray", "cure", "remedy", "what", "how", "medicine", "dosage", "this", "help"]):
        disease = context.get("disease", "Unknown")
        crop = context.get("crop", "Crop")
        recommendations = context.get("recommendations", [])
        organic_ferts = context.get("organic_fertilizers", [])
        
        # Check if we have deep knowledge for this diagnosed disease
        d_match = _match_disease(f"{crop} {disease}")
        if d_match:
            return _format_disease_response(d_match, crop_hint=crop), False

        rec_lines = "\n".join([f"• {r}" for r in recommendations]) if recommendations else "• Apply certified protective copper hydroxide @ 2 g/L or bio-fungicide."
        org_lines = "\n".join([f"• {f}" for f in organic_ferts[:3]]) if organic_ferts else "• Drench soil with Liquid Jeevamrutha @ 200 L/acre."

        return (
            f"🌾 **Targeted Agronomic Prescription for {crop} ({disease})**\n\n"
            f"**Recommended Interventions:**\n{rec_lines}\n\n"
            f"**Organic Bio-Fertilizer & Soil Rejuvenation:**\n{org_lines}\n\n"
            f"**Application Protocol:**\n"
            f"• Dilute cold-pressed Neem oil (10,000 ppm) @ 4-5 mL/L with 1 mL soap emulsifier for foliar cover.\n"
            f"• Inoculate root zone with Trichoderma viride @ 5 g/L to deter secondary opportunistic root pathogens.\n"
            f"• Maintain strict field sanitation; inspect lower leaves daily for symptom progression.",
            False
        )

    # C. Match Specific Diseases
    matched_disease = _match_disease(norm_msg)
    if matched_disease:
        # Extract crop hint if mentioned
        crop_hint = None
        for c in ["tomato", "potato", "grape", "apple", "corn", "maize", "chili", "pepper", "squash", "cucumber", "orange", "citrus", "peach", "cherry", "strawberry", "blueberry", "soybean"]:
            if c in norm_msg:
                crop_hint = c.capitalize()
                break
        return _format_disease_response(matched_disease, crop_hint=crop_hint), False

    # D. Organic Preparations & Recipes
    if "jeevamrut" in norm_msg or "jeevamrutha" in norm_msg:
        return ORGANIC_PREPARATIONS["jeevamrutha"], False
    if "panchagavya" in norm_msg or "panchgavya" in norm_msg:
        return ORGANIC_PREPARATIONS["panchagavya"], False
    if "neem" in norm_msg and ("oil" in norm_msg or "spray" in norm_msg or "ratio" in norm_msg or "dose" in norm_msg or "dosage" in norm_msg):
        return ORGANIC_PREPARATIONS["neem_oil"], False
    if "trichoderma" in norm_msg:
        return ORGANIC_PREPARATIONS["trichoderma"], False
    if "vermicompost" in norm_msg:
        return ORGANIC_PREPARATIONS["vermicompost"], False

    # E. Satellite NDVI & Precision Ag Questions
    if any(w in norm_msg for w in ["ndvi", "satellite", "vegetation index", "canopy"]):
        return (
            "🛰️ **Satellite NDVI (Normalized Difference Vegetation Index) Guide:**\n\n"
            "• **NDVI Range & Interpretation:**\n"
            "  - **0.65 – 0.85:** Healthy, dense, highly active photosynthetic canopy.\n"
            "  - **0.40 – 0.60:** Moderate canopy vigor; indicates early water stress, nutrient deficit, or localized fungal lesions.\n"
            "  - **< 0.35:** Severe stress, significant canopy defoliation, standing water, or bare soil.\n\n"
            "• **What to do if NDVI drops suddenly:**\n"
            "  1. Scout the affected zone immediately using our 'Risk Heatmap' quadrant coordinates.\n"
            "  2. Take high-resolution close-up leaf photographs using the 'Leaf Diagnosis' tool to verify pathogen identity.\n"
            "  3. Check soil moisture sensors or root depth for irrigation blockage or soil saturation.",
            False
        )

    # F. General Spray Timing & Weather Windows
    if any(w in norm_msg for w in ["spray window", "weather", "when to spray", "timing", "wind"]):
        return (
            "⏱️ **Optimal Agronomic Spray Window Protocol:**\n\n"
            "• **Wind Speed:** Must be < 12 km/h (prevents aerosol drift to adjacent non-target crops).\n"
            "• **Ambient Temperature:** Best between 18°C and 28°C. Never spray sulfur or oils above 32°C (causes leaf phytotoxicity).\n"
            "• **Relative Humidity:** 50% to 75% ensures optimal droplet drying without rapid evaporation or prolonged wetness.\n"
            "• **Rain Forecast:** Ensure zero rain probability for at least 3-4 hours post application so systemic chemicals absorb.\n"
            "• **Time of Day:** Early morning (6:30 AM – 9:00 AM) or late afternoon (4:30 PM – 6:30 PM) to protect pollinating bees.",
            False
        )

    # G. General Healthy Plant Maintenance
    if any(w in norm_msg for w in ["healthy", "maintain", "growth", "yield", "fertilizer", "npk"]):
        return (
            "🌱 **High-Yield Crop Health Maintenance Protocol:**\n\n"
            "• **Balanced Nutrition:** Apply N-P-K (19:19:19) water-soluble foliar spray @ 5 g/L during active vegetative flush.\n"
            "• **Bio-Fortification:** Soil drench with Liquid Jeevamrutha @ 200 L/acre bi-weekly to sustain beneficial microbial mycorrhizae.\n"
            "• **Preventative Protection:** Regular 14-day preventative spray of cold-pressed Neem oil (10,000 ppm) @ 3 mL/L + Trichoderma viride @ 5 g/L prevents fungal spores from establishing.\n"
            "• **Soil Moisture:** Maintain root-zone moisture between 65% and 75% field capacity using drip irrigation.",
            False
        )

    # H. Intelligent Comprehensive Fallback
    return (
        "🌾 **PhytoVision Agronomic Diagnostic Guidance:**\n\n"
        "To provide the most precise chemical dosage and organic remedy, please specify:\n"
        "1. **Crop Name** (e.g., Tomato, Potato, Grape, Apple, Corn, Pepper, Squash)\n"
        "2. **Observed Symptoms** (e.g., yellow spots, white powder on leaves, brown concentric rings, leaf curl, wilting, bottom rot)\n"
        "3. **Suspected Disease or Pest** (e.g., Early Blight, Late Blight, Powdery Mildew, Rust, Spider Mites, Aphids)\n\n"
        "💡 *Tip: You can also upload a leaf photo in our 'Leaf Diagnosis' tab for instant deep-learning pathology classification with Grad-CAM heatmaps!*",
        False
    )
