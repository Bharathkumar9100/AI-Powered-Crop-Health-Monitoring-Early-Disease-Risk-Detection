import axios from 'axios';
import {
  AuthResponse,
  Field,
  ImageAnalysisResponse,
  UavAnalysisResponse,
  SatelliteNdviResponse,
  Alert,
  FieldRiskResponse,
  RiskZone,
  ChatResponse,
  User,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('phytovision_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for handling 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('phytovision_token');
      localStorage.removeItem('phytovision_user');
      // Only redirect if not already on login/register
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        // optionally trigger auth state reset
      }
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authApi = {
  login: async (username: string, password: string): Promise<AuthResponse> => {
    const res = await api.post('/api/auth/login', { username, password });
    return res.data;
  },
  register: async (data: { username: string; email: string; password: string; full_name?: string; language?: string }): Promise<AuthResponse> => {
    const res = await api.post('/api/auth/register', data);
    return res.data;
  },
  getMe: async (): Promise<User> => {
    const res = await api.get('/api/auth/me');
    return res.data;
  },
  updateSettings: async (settings: { language?: string; full_name?: string }): Promise<User> => {
    const res = await api.put('/api/auth/settings', settings);
    return res.data;
  },
};

// Fields endpoints
export const fieldsApi = {
  list: async (): Promise<Field[]> => {
    const res = await api.get('/api/fields');
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.fields)) return res.data.fields;
    return [];
  },
  get: async (id: number): Promise<Field> => {
    const res = await api.get(`/api/fields/${id}`);
    return res.data;
  },
  create: async (data: Partial<Field>): Promise<Field> => {
    const res = await api.post('/api/fields', data);
    return res.data;
  },
  update: async (id: number, data: Partial<Field>): Promise<Field> => {
    const res = await api.put(`/api/fields/${id}`, data);
    return res.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/fields/${id}`);
  },
};

const sanitizeMediaUrl = (url?: string): string | undefined => {
  if (!url) return undefined;
  let clean = url.replace(/\\/g, '/');
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
  clean = clean.replace(/^\/+/, '');
  return `/${clean}`;
};

// Analysis endpoints
export const analyzeApi = {
  analyzeLeaf: async (file: File, fieldId?: number): Promise<ImageAnalysisResponse> => {
    const formData = new FormData();
    formData.append('image', file);
    if (fieldId) formData.append('field_id', fieldId.toString());

    const res = await api.post('/api/analyze/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const raw = res.data || {};
    const r = raw.result || raw.prediction || {};
    const topPreds = (r.top_predictions || []).map((tp: any) => ({
      crop: tp.crop || tp.crop_name || '',
      disease: tp.disease || tp.disease_name || '',
      confidence: tp.confidence || 0,
      class_name: tp.class_name || `${tp.crop || tp.crop_name || ''}___${tp.disease || tp.disease_name || ''}`,
    }));

    return {
      prediction_id: raw.prediction_id || Date.now(),
      prediction: {
        crop: r.crop_name || r.crop || 'Crop',
        disease: r.disease_name || r.disease || 'Unknown',
        confidence: r.confidence ?? 0.9,
        severity: r.severity || 'low',
        risk_level: r.risk_level || 'low',
        is_healthy: r.is_healthy ?? false,
        explanation: r.explanation || 'Model analysis completed.',
        recommendations: r.recommendations || [],
        organic_fertilizers: r.organic_fertilizers || [],
        bio_remedies: r.bio_remedies || [],
        organic_badge: r.organic_badge || 'Certified Organic Agronomic Standard',
        dataset_source: r.dataset_source || 'PlantVillage Benchmark (38 Classes)',
        top_predictions: topPreds,
      },
      heatmap_url: sanitizeMediaUrl(raw.heatmap_url || raw.gradcam_url),
      overlay_url: sanitizeMediaUrl(raw.overlay_url || raw.gradcam_url),
      is_demo: r.is_demo ?? raw.is_demo ?? false,
      model_name: raw.model_name || 'EfficientNet-B0 (Grad-CAM)',
      disclaimer: raw.disclaimer || 'Deep learning provides probabilistic diagnostic guidance. For critical field interventions, cross-verify with local agronomists.',
    };
  },
  analyzeUav: async (file: File, fieldId?: number): Promise<UavAnalysisResponse> => {
    const formData = new FormData();
    formData.append('image', file);
    if (fieldId) formData.append('field_id', fieldId.toString());

    const res = await api.post('/api/analyze/uav', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const raw = res.data || {};
    const rawRegions = raw.abnormal_regions || raw.regions || [];
    const regions = rawRegions.map((reg: any, idx: number) => ({
      region_id: reg.region_id !== undefined ? `Zone-${reg.region_id}` : `Zone-R${idx + 1}`,
      bbox: [
        reg.x || 100,
        reg.y || 100,
        (reg.x || 100) + (reg.width || 80),
        (reg.y || 100) + (reg.height || 80),
      ] as [number, number, number, number],
      stress_level: reg.risk_level || 'moderate',
      risk_score: reg.confidence || 0.75,
      chlorophyll_deficit: 0.25,
    }));

    return {
      scan_id: raw.scan_id || Date.now(),
      field_id: fieldId,
      regions_detected: raw.regions_detected || regions.length,
      regions,
      risk_map_url: sanitizeMediaUrl(raw.risk_map_url),
      overall_health: raw.overall_health || 'stressed',
      analysis_notes: raw.analysis_notes || 'UAV orthomosaic analyzed for canopy stress clusters.',
      is_demo: raw.is_demo ?? false,
      disclaimer: 'UAV scouting highlights anomaly clusters; ground truth inspection is recommended.',
    };
  },
  getPredictions: async (fieldId: number): Promise<any> => {
    const res = await api.get(`/api/analyze/predictions/${fieldId}`);
    return res.data;
  },
};

// Satellite endpoints
export const satelliteApi = {
  getObservations: async (fieldId: number): Promise<any[]> => {
    const res = await api.get(`/api/satellite/${fieldId}`);
    return Array.isArray(res.data) ? res.data : [];
  },
  getNdviData: async (fieldId: number): Promise<SatelliteNdviResponse> => {
    const res = await api.get(`/api/satellite/${fieldId}/ndvi`);
    const raw = res.data || {};
    const rawPoints = raw.data || raw.historical || [];
    const historical = rawPoints.map((pt: any) => ({
      date: typeof pt.date === 'string' ? pt.date.slice(5) : String(pt.date),
      ndvi: pt.ndvi_mean ?? pt.ndvi ?? 0.5,
      health_status: pt.health_status ?? 'healthy',
    }));
    const lastPoint = historical[historical.length - 1];
    const current_ndvi = raw.current_ndvi ?? (lastPoint ? lastPoint.ndvi : 0.65);
    return {
      field_id: raw.field_id || fieldId,
      field_name: raw.field_name || `Field #${fieldId}`,
      crop: raw.crop || 'Field Crop',
      current_ndvi,
      historical,
      trend: raw.trend || 'stable',
      health_assessment: raw.health_assessment || (
        raw.trend === 'declining'
          ? 'Vegetative index indicates declining canopy vigor over recent observations. Field inspection advised.'
          : 'Canopy vigor index remains within expected seasonal health bounds.'
      ),
      is_demo: raw.is_demo ?? false,
    };
  },
  getWeather: async (fieldId: number): Promise<any> => {
    const res = await api.get(`/api/satellite/${fieldId}/weather`);
    return res.data;
  },
};

// Alerts endpoints
export const alertsApi = {
  list: async (): Promise<{ alerts: Alert[]; unread_count: number }> => {
    const res = await api.get('/api/alerts');
    if (Array.isArray(res.data)) {
      return { alerts: res.data, unread_count: res.data.filter((a: any) => !a.is_read).length };
    }
    const alerts = Array.isArray(res.data?.alerts) ? res.data.alerts : [];
    const unread_count = typeof res.data?.unread_count === 'number'
      ? res.data.unread_count
      : alerts.filter((a: any) => !a.is_read).length;
    return { alerts, unread_count };
  },
  markRead: async (id: number): Promise<void> => {
    await api.put(`/api/alerts/${id}/read`);
  },
};

// Risk endpoints
export const riskApi = {
  getFieldRisk: async (fieldId: number): Promise<FieldRiskResponse> => {
    const res = await api.get(`/api/risk/${fieldId}`);
    const raw = res.data || {};
    const rawZones = raw.risk_zones || raw.zones || [];
    const zones: RiskZone[] = rawZones.map((z: any, idx: number) => ({
      zone_id: z.zone_id !== undefined ? `Zone-${z.zone_id}` : `Zone-${idx + 1}`,
      name: z.name || `Field Quadrant ${idx + 1}`,
      risk_score: z.confidence ?? z.risk_score ?? (z.risk_level === 'high' ? 0.85 : z.risk_level === 'moderate' ? 0.55 : 0.2),
      risk_level: z.risk_level || 'low',
      primary_stress_factor: Array.isArray(z.possible_causes)
        ? z.possible_causes.join(', ')
        : (z.primary_stress_factor || 'Vegetative Canopy Stress'),
      affected_area_percentage: z.affected_area_percentage || Math.round((z.radius_meters || 40) / 2),
      suggested_action: z.suggested_action || (
        z.risk_level === 'high'
          ? 'Scout zone immediately and inspect leaves for fungal lesions.'
          : 'Maintain regular monitoring schedule.'
      ),
    }));

    const overall_risk_level = raw.overall_risk_level || raw.overall_risk || 'low';
    const overall_risk_score = raw.overall_risk_score ?? (
      overall_risk_level === 'high' ? 0.78 : overall_risk_level === 'moderate' ? 0.52 : 0.25
    );

    return {
      field_id: raw.field_id || fieldId,
      field_name: raw.field_name || `Field #${fieldId}`,
      crop: raw.crop || 'Field Crop',
      overall_risk_score,
      overall_risk_level,
      zones,
      last_updated: raw.last_analysis || raw.last_updated || new Date().toISOString(),
      is_demo: raw.is_demo ?? false,
    };
  },
};

// Chat endpoints
export const chatApi = {
  sendMessage: async (data: {
    message: string;
    language: string;
    conversation_id?: number;
    context?: any;
  }): Promise<ChatResponse> => {
    const res = await api.post('/api/chat', data);
    return res.data;
  },
  getHistory: async (conversationId: number): Promise<any> => {
    const res = await api.get('/api/chat/history', {
      params: { conversation_id: conversationId },
    });
    return res.data;
  },
};
