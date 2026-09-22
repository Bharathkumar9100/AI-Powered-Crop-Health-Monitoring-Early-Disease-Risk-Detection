export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  language: 'en' | 'ta' | 'hi' | 'te' | 'ml';
  is_active: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Field {
  id: number;
  name: string;
  crop: string;
  latitude?: number;
  longitude?: number;
  area_hectares?: number;
  planting_date?: string;
  status: 'healthy' | 'at_risk' | 'critical' | 'unknown';
  notes?: string;
  created_at: string;
}

export interface PredictionTopItem {
  crop: string;
  disease: string;
  confidence: number;
  class_name: string;
}

export interface BioRemedyItem {
  title: string;
  type: string;
  application: string;
  description: string;
}

export interface PredictionResult {
  crop: string;
  disease: string;
  confidence: number;
  severity: 'none' | 'low' | 'moderate' | 'high' | 'critical';
  risk_level: 'low' | 'moderate' | 'high';
  is_healthy: boolean;
  explanation: string;
  recommendations: string[];
  organic_fertilizers?: string[];
  bio_remedies?: BioRemedyItem[];
  organic_badge?: string;
  dataset_source?: string;
  top_predictions: PredictionTopItem[];
}

export interface ImageAnalysisResponse {
  prediction_id: number;
  prediction: PredictionResult;
  heatmap_url?: string;
  overlay_url?: string;
  is_demo: boolean;
  model_name: string;
  disclaimer: string;
}

export interface UavRegion {
  region_id: string;
  bbox: [number, number, number, number];
  stress_level: 'low' | 'moderate' | 'high' | 'critical';
  risk_score: number;
  chlorophyll_deficit?: number;
}

export interface UavAnalysisResponse {
  scan_id: number;
  field_id?: number;
  regions_detected: number;
  regions: UavRegion[];
  risk_map_url?: string;
  overall_health: 'healthy' | 'stressed' | 'critical';
  analysis_notes: string;
  is_demo: boolean;
  disclaimer: string;
}

export interface SatelliteObservation {
  id: number;
  field_id: number;
  observation_date: string;
  ndvi_mean: number;
  ndvi_min?: number;
  ndvi_max?: number;
  ndvi_map_path?: string;
  health_status?: string;
  cloud_cover?: number;
  source: string;
  is_demo: boolean;
}

export interface SatelliteNdviResponse {
  field_id: number;
  field_name: string;
  crop: string;
  current_ndvi: number;
  historical: {
    date: string;
    ndvi: number;
    health_status: string;
  }[];
  trend: 'improving' | 'stable' | 'declining';
  health_assessment: string;
  is_demo: boolean;
}

export interface Alert {
  id: number;
  field_id?: number;
  title: string;
  message: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  is_read: boolean;
  created_at: string;
}

export interface RiskZone {
  zone_id: string;
  name: string;
  risk_score: number; // 0 - 1
  risk_level: 'low' | 'moderate' | 'high';
  primary_stress_factor: string;
  affected_area_percentage: number;
  suggested_action: string;
}

export interface FieldRiskResponse {
  field_id: number;
  field_name: string;
  crop: string;
  overall_risk_score: number;
  overall_risk_level: 'low' | 'moderate' | 'high';
  zones: RiskZone[];
  last_updated: string;
  is_demo: boolean;
}

export interface ChatMessage {
  role: 'farmer' | 'assistant';
  content: string;
  timestamp?: string;
  language?: string;
}

export interface ChatResponse {
  conversation_id: number;
  response: string;
  language: string;
  is_demo: boolean;
}
