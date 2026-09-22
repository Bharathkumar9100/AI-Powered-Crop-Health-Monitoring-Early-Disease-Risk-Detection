import React, { useState, useEffect } from 'react';
import {
  Sprout,
  Plus,
  MapPin,
  Calendar,
  Layers,
  Trash2,
  ScanLine,
  Globe2,
  Navigation,
  X,
  Loader2,
} from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { fieldsApi } from '../api/client';
import { Field } from '../types';

interface FieldsPageProps {
  onNavigate: (tab: string) => void;
}

export const FieldsPage: React.FC<FieldsPageProps> = ({ onNavigate }) => {
  const { t } = useTranslation();

  const [fields, setFields] = useState<Field[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [crop, setCrop] = useState('Tomato');
  const [area, setArea] = useState('4.0');
  const [lat, setLat] = useState('11.0168');
  const [lng, setLng] = useState('76.9558');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadFields = async () => {
    try {
      const data = await fieldsApi.list();
      setFields(data);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFields();
  }, []);

  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await fieldsApi.create({
        name,
        crop,
        area_hectares: parseFloat(area) || 1.0,
        latitude: parseFloat(lat) || 0,
        longitude: parseFloat(lng) || 0,
        status: 'healthy',
        notes,
      });
      setIsModalOpen(false);
      setName('');
      setNotes('');
      await loadFields();
    } catch (err) {
      console.error('Failed to create field', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to remove this field?')) {
      try {
        await fieldsApi.delete(id);
        setFields((prev) => prev.filter((f) => f.id !== id));
      } catch (err) {
        console.error('Failed to delete field', err);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>{t('nav_fields')}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Field Registry
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage boundary coordinates, crop planting dates, and vegetative health statuses.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs shadow-glow-emerald hover:brightness-110 active:scale-95 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Field</span>
        </button>
      </div>

      {/* Field Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {((Array.isArray(fields) && fields.length) ? fields : [
          { id: 1, name: "North Tomato Plot A", crop: "Tomato", area_hectares: 4.5, latitude: 11.0168, longitude: 76.9558, status: "at_risk", notes: "Showing signs of early blight near northwest corner sprinkler line." },
          { id: 2, name: "East Corn Field", crop: "Corn", area_hectares: 8.2, latitude: 11.0250, longitude: 76.9700, status: "healthy", notes: "Optimal vegetative stage. Canopy closure at 85%." },
          { id: 3, name: "South Potato Block", crop: "Potato", area_hectares: 3.0, latitude: 11.0080, longitude: 76.9420, status: "critical", notes: "Late blight lesion spread reported. Urgent fungicide schedule needed." },
          { id: 4, name: "Sunrise Grape Vineyard", crop: "Grape", area_hectares: 6.1, latitude: 11.0310, longitude: 76.9850, status: "healthy", notes: "Pruning completed. Fruit development stage normal." },
        ]).map((field: any) => (
          <div
            key={field.id}
            className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col justify-between hover:border-emerald-500/40 transition"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Sprout className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{field.name}</h3>
                    <p className="text-xs text-slate-400">{field.crop} · {field.area_hectares} ha</p>
                  </div>
                </div>

                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  field.status === 'healthy' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  field.status === 'at_risk' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {field.status}
                </span>
              </div>

              {field.notes && (
                <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 mb-3 leading-relaxed">
                  {field.notes}
                </p>
              )}

              <div className="space-y-1 text-xs text-slate-400 mb-4">
                {field.latitude && (
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{field.latitude.toFixed(4)}°N, {field.longitude.toFixed(4)}°E</span>
                  </div>
                )}
              </div>
            </div>

            {/* Field Action Buttons */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-1">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onNavigate('leaf-diagnosis')}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 hover:border-emerald-500/30 transition"
                  title="Diagnose leaf disease"
                >
                  <ScanLine className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onNavigate('satellite-ndvi')}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 hover:border-cyan-500/30 transition"
                  title="View satellite NDVI"
                >
                  <Globe2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onNavigate('uav-scan')}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-teal-400 border border-slate-800 hover:border-teal-500/30 transition"
                  title="Run UAV drone scan"
                >
                  <Navigation className="w-4 h-4" />
                </button>
              </div>

              {fields.length > 0 && (
                <button
                  onClick={() => handleDelete(field.id)}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition"
                  title="Remove field"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Field Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md rounded-2xl p-6 border border-slate-700 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-lg">Register Crop Field</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateField} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Field Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. East Tomato Block B"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Crop Type</label>
                  <select
                    value={crop}
                    onChange={(e) => setCrop(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Tomato">Tomato</option>
                    <option value="Potato">Potato</option>
                    <option value="Corn">Corn</option>
                    <option value="Grape">Grape</option>
                    <option value="Apple">Apple</option>
                    <option value="Pepper">Pepper</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Area (Hectares)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Agronomic Notes</label>
                <textarea
                  rows={2}
                  placeholder="Soil moisture, irrigation type, fertilizer applied..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-bold shadow-glow-emerald hover:brightness-110 transition flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Field'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
