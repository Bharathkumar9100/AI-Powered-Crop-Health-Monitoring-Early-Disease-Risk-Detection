import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Crosshair,
  Layers,
  Compass,
  Play,
  Check,
  RotateCcw,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Sliders,
  Sparkles,
  Info,
  Calendar,
  Cloud,
  ChevronRight,
  Loader2,
  Eye,
  Maximize2,
  ScanLine,
} from 'lucide-react';
import { Field, FieldHealthSummary, SatelliteScene } from '../../types';
import { satelliteApi } from '../../api/client';

interface FieldSatelliteMapProps {
  fields: Field[];
  selectedField: Field | null;
  onSelectField: (field: Field) => void;
  onAnalysisComplete?: (summary: FieldHealthSummary) => void;
  onNavigateToLeafScan?: (fieldId?: number) => void;
}

// Spherical geodesic area calculation for polygon in hectares
function calculatePolygonAreaHectares(coords: [number, number][]): number {
  if (coords.length < 3) return 0;
  const RADIUS = 6378137; // Earth radius in meters
  let area = 0;
  const numPoints = coords.length;

  for (let i = 0; i < numPoints; i++) {
    const p1 = coords[i];
    const p2 = coords[(i + 1) % numPoints];
    const lat1 = (p1[0] * Math.PI) / 180;
    const lat2 = (p2[0] * Math.PI) / 180;
    const lon1 = (p1[1] * Math.PI) / 180;
    const lon2 = (p2[1] * Math.PI) / 180;
    area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  area = Math.abs((area * RADIUS * RADIUS) / 2.0);
  return Number((area / 10000.0).toFixed(2)); // m^2 to hectares
}

export const FieldSatelliteMap: React.FC<FieldSatelliteMapProps> = ({
  fields,
  selectedField,
  onSelectField,
  onAnalysisComplete,
  onNavigateToLeafScan,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layers refs
  const baseTilesRef = useRef<L.TileLayer | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const polygonLayerRef = useRef<L.Polygon | null>(null);
  const vertexMarkersRef = useRef<L.CircleMarker[]>([]);
  const ndviOverlayRef = useRef<L.ImageOverlay | null>(null);
  const stressOverlayRef = useRef<L.ImageOverlay | null>(null);

  // User Location State
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'prompting' | 'granted' | 'denied' | 'error'>('idle');
  const [locationErrorMsg, setLocationErrorMsg] = useState<string>('');

  // Drawing State
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawnPoints, setDrawnPoints] = useState<[number, number][]>([]);
  const [calculatedArea, setCalculatedArea] = useState<number>(0);

  // Map View Mode & Layers
  const [basemapType, setBasemapType] = useState<'satellite' | 'street'>('satellite');
  const [activeOverlay, setActiveOverlay] = useState<'none' | 'ndvi' | 'stress'>('ndvi');
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.85);

  // Satellite search & scene selection
  const [isSearchingScenes, setIsSearchingScenes] = useState<boolean>(false);
  const [availableScenes, setAvailableScenes] = useState<SatelliteScene[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string>('');
  const [cloudCoverThreshold, setCloudCoverThreshold] = useState<number>(20);

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [healthSummary, setHealthSummary] = useState<FieldHealthSummary | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center (Coimbatore Agricultural zone)
    const initialLat = selectedField?.latitude || 11.0168;
    const initialLng = selectedField?.longitude || 76.9558;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 15,
      zoomControl: false,
    });

    // Zoom control at bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Esri World Imagery (Real High-Resolution Satellite Basemap)
    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP',
      }
    ).addTo(map);

    baseTilesRef.current = satelliteLayer;
    mapInstanceRef.current = map;

    // Map click handler for polygon drawing
    map.on('click', (e: L.LeafletMouseEvent) => {
      // Handled via state ref in callback below
      handleMapClick(e.latlng.lat, e.latlng.lng);
    });

    // Auto-request location on first load
    requestDeviceLocation(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Basemap Tiles
  const toggleBasemap = (type: 'satellite' | 'street') => {
    if (!mapInstanceRef.current || !baseTilesRef.current) return;
    mapInstanceRef.current.removeLayer(baseTilesRef.current);

    if (type === 'satellite') {
      baseTilesRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19 }
      ).addTo(mapInstanceRef.current);
    } else {
      baseTilesRef.current = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { maxZoom: 19 }
      ).addTo(mapInstanceRef.current);
    }
    setBasemapType(type);
  };

  // Request browser location
  const requestDeviceLocation = (mapOverride?: L.Map) => {
    const map = mapOverride || mapInstanceRef.current;
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setLocationStatus('prompting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setLocationStatus('granted');

        if (map) {
          map.flyTo([latitude, longitude], 16, { animate: true, duration: 1.5 });

          // Remove prior marker
          if (userMarkerRef.current) {
            map.removeLayer(userMarkerRef.current);
          }

          // Pulsing user location icon
          const userIcon = L.divIcon({
            className: 'custom-gps-pin',
            html: `
              <div class="relative flex items-center justify-center">
                <div class="w-6 h-6 rounded-full bg-cyan-500/30 animate-ping absolute"></div>
                <div class="w-4 h-4 rounded-full bg-cyan-500 border-2 border-white shadow-lg relative z-10"></div>
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });

          userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon })
            .addTo(map)
            .bindPopup('<b>Farmer Detected GPS Location</b><br/>Ready for agricultural field boundary selection.')
            .openPopup();
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocationStatus('denied');
          setLocationErrorMsg('Location permission was denied. You can manually pan the map or select an existing field.');
        } else {
          setLocationStatus('error');
          setLocationErrorMsg('GPS location is currently unavailable. You can manually select your field.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Handle Map Click when in drawing mode
  const isDrawingRef = useRef(isDrawing);
  isDrawingRef.current = isDrawing;
  const drawnPointsRef = useRef(drawnPoints);
  drawnPointsRef.current = drawnPoints;

  const handleMapClick = (lat: number, lng: number) => {
    if (!isDrawingRef.current || !mapInstanceRef.current) return;

    const newPoints = [...drawnPointsRef.current, [lat, lng] as [number, number]];
    setDrawnPoints(newPoints);

    // Calculate area
    const area = calculatePolygonAreaHectares(newPoints);
    setCalculatedArea(area);

    renderPolygonOnMap(newPoints);
  };

  const renderPolygonOnMap = (points: [number, number][]) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old vertex markers
    vertexMarkersRef.current.forEach((m) => map.removeLayer(m));
    vertexMarkersRef.current = [];

    // Clear old polygon
    if (polygonLayerRef.current) {
      map.removeLayer(polygonLayerRef.current);
      polygonLayerRef.current = null;
    }

    if (points.length === 0) return;

    // Draw vertex dots
    points.forEach((pt, idx) => {
      const marker = L.circleMarker(pt, {
        radius: 5,
        color: '#38bdf8',
        fillColor: '#0284c7',
        fillOpacity: 1,
        weight: 2,
      }).addTo(map);
      vertexMarkersRef.current.push(marker);
    });

    // Draw polygon line/area
    if (points.length >= 2) {
      polygonLayerRef.current = L.polygon(points, {
        color: '#10b981',
        weight: 2.5,
        fillColor: '#10b981',
        fillOpacity: 0.25,
        dashArray: points.length < 3 ? '4 4' : undefined,
      }).addTo(map);
    }
  };

  // Start Drawing Mode
  const handleStartDrawing = () => {
    setIsDrawing(true);
    setDrawnPoints([]);
    setCalculatedArea(0);
    renderPolygonOnMap([]);
    // Remove old raster overlays
    clearOverlays();
  };

  // Complete Drawing
  const handleFinishDrawing = () => {
    if (drawnPoints.length < 3) return;
    setIsDrawing(false);
    renderPolygonOnMap(drawnPoints);
    // Fit map bounds to field
    if (mapInstanceRef.current && polygonLayerRef.current) {
      mapInstanceRef.current.fitBounds(polygonLayerRef.current.getBounds(), { padding: [40, 40] });
    }
    // Search for Sentinel-2 scenes covering this geometry
    triggerSentinelSearch();
  };

  // Reset Drawing
  const handleResetDrawing = () => {
    setIsDrawing(false);
    setDrawnPoints([]);
    setCalculatedArea(0);
    renderPolygonOnMap([]);
    clearOverlays();
    setHealthSummary(null);
  };

  const clearOverlays = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (ndviOverlayRef.current) {
      map.removeLayer(ndviOverlayRef.current);
      ndviOverlayRef.current = null;
    }
    if (stressOverlayRef.current) {
      map.removeLayer(stressOverlayRef.current);
      stressOverlayRef.current = null;
    }
  };

  // Sync with selected field
  useEffect(() => {
    if (!selectedField || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Check if field has boundary GeoJSON
    let fieldCoords: [number, number][] = [];
    if (selectedField.boundary_geojson) {
      try {
        const geo = JSON.parse(selectedField.boundary_geojson);
        if (geo.type === 'Polygon' && geo.coordinates && geo.coordinates[0]) {
          fieldCoords = geo.coordinates[0].map((pt: [number, number]) => [pt[1], pt[0]]);
        }
      } catch {}
    }

    // Fallback: construct bounding box polygon around latitude/longitude
    if (fieldCoords.length < 3 && selectedField.latitude && selectedField.longitude) {
      const lat = selectedField.latitude;
      const lng = selectedField.longitude;
      const area = selectedField.area_hectares || 2.4;
      const side = Math.sqrt(area * 10000.0) / 111000.0 / 2.0;
      fieldCoords = [
        [lat - side, lng - side],
        [lat - side, lng + side],
        [lat + side, lng + side],
        [lat + side, lng - side],
      ];
    }

    if (fieldCoords.length >= 3) {
      setDrawnPoints(fieldCoords);
      setCalculatedArea(selectedField.area_hectares || calculatePolygonAreaHectares(fieldCoords));
      renderPolygonOnMap(fieldCoords);

      if (polygonLayerRef.current) {
        map.fitBounds(polygonLayerRef.current.getBounds(), { padding: [50, 50] });
      } else {
        map.flyTo([selectedField.latitude || 11.0168, selectedField.longitude || 76.9558], 16);
      }

      // Fetch latest observation for this field
      satelliteApi
        .getLatest(selectedField.id)
        .then((latest: FieldHealthSummary) => {
          if (latest) {
            setHealthSummary(latest);
            if (onAnalysisComplete) onAnalysisComplete(latest);
            let currentCoords = fieldCoords;
            if (currentCoords.length < 3 && latest.field_geometry?.coordinates?.[0]) {
              const pts = latest.field_geometry.coordinates[0];
              currentCoords = pts.map((p: [number, number]) => [p[1], p[0]]);
              setDrawnPoints(currentCoords);
              renderPolygonOnMap(currentCoords);
            }
            applyRasterOverlays(latest, currentCoords, activeOverlay);
          }
        })
        .catch(() => {});
    }
  }, [selectedField]);

  // Search Sentinel-2 Scenes
  const triggerSentinelSearch = async () => {
    if (!selectedField && drawnPoints.length < 3) return;
    const fieldId = selectedField?.id || 1;
    setIsSearchingScenes(true);

    const geo = getGeoJsonFromDrawnPoints();
    try {
      const scenes = await satelliteApi.searchScenes(fieldId, {
        geometry: geo,
        max_cloud_cover: cloudCoverThreshold,
      });
      setAvailableScenes(scenes);
      if (scenes.length > 0) {
        setSelectedSceneId(scenes[0].scene_id);
      }
    } catch (err) {
      console.error('Failed to search Sentinel-2 scenes', err);
    } finally {
      setIsSearchingScenes(false);
    }
  };

  const getGeoJsonFromDrawnPoints = () => {
    if (drawnPoints.length < 3) return undefined;
    // GeoJSON is [longitude, latitude]
    const closed = [...drawnPoints, drawnPoints[0]];
    return {
      type: 'Polygon',
      coordinates: [closed.map((p) => [p[1], p[0]])],
    };
  };

  // Apply raster overlays to Leaflet
  const applyRasterOverlays = (
    summary: FieldHealthSummary,
    coords: [number, number][],
    targetOverlay?: 'none' | 'ndvi' | 'stress'
  ) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    clearOverlays();

    let bounds: L.LatLngBounds | null = null;
    if (summary.bbox) {
      bounds = L.latLngBounds(
        [summary.bbox.min_lat, summary.bbox.min_lng],
        [summary.bbox.max_lat, summary.bbox.max_lng]
      );
    } else if (coords && coords.length >= 3) {
      const lats = coords.map((c) => c[0]);
      const lngs = coords.map((c) => c[1]);
      bounds = L.latLngBounds([Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]);
    } else if (selectedField?.latitude && selectedField?.longitude) {
      const lat = selectedField.latitude;
      const lng = selectedField.longitude;
      const side = 0.003;
      bounds = L.latLngBounds([lat - side, lng - side], [lat + side, lng + side]);
    }

    if (!bounds) return;

    if (summary.ndvi_map_url) {
      ndviOverlayRef.current = L.imageOverlay(summary.ndvi_map_url, bounds, {
        opacity: overlayOpacity,
        interactive: false,
      });
    }

    if (summary.stress_map_url) {
      stressOverlayRef.current = L.imageOverlay(summary.stress_map_url, bounds, {
        opacity: overlayOpacity,
        interactive: false,
      });
    }

    const overlayMode = targetOverlay !== undefined ? targetOverlay : activeOverlay;
    if (overlayMode === 'ndvi' && ndviOverlayRef.current) {
      ndviOverlayRef.current.addTo(map);
    } else if (overlayMode === 'stress' && stressOverlayRef.current) {
      stressOverlayRef.current.addTo(map);
    } else if (ndviOverlayRef.current) {
      ndviOverlayRef.current.addTo(map);
      setActiveOverlay('ndvi');
    }

    // Auto-fit map to the raster overlay bounds so user sees the heatmap immediately
    map.fitBounds(bounds, { padding: [35, 35] });
  };

  // Switch overlay layer
  const handleToggleOverlay = (type: 'none' | 'ndvi' | 'stress') => {
    setActiveOverlay(type);
    const map = mapInstanceRef.current;
    if (!map) return;

    if (ndviOverlayRef.current && map.hasLayer(ndviOverlayRef.current)) {
      map.removeLayer(ndviOverlayRef.current);
    }
    if (stressOverlayRef.current && map.hasLayer(stressOverlayRef.current)) {
      map.removeLayer(stressOverlayRef.current);
    }

    if (type === 'stress') {
      if (stressOverlayRef.current) {
        stressOverlayRef.current.addTo(map);
      } else if (healthSummary) {
        applyRasterOverlays(healthSummary, drawnPoints, 'stress');
      }
    } else if (type === 'ndvi') {
      if (ndviOverlayRef.current) {
        ndviOverlayRef.current.addTo(map);
      } else if (healthSummary) {
        applyRasterOverlays(healthSummary, drawnPoints, 'ndvi');
      }
    }
  };

  // Update overlay opacity
  const handleOpacityChange = (val: number) => {
    setOverlayOpacity(val);
    if (ndviOverlayRef.current) ndviOverlayRef.current.setOpacity(val);
    if (stressOverlayRef.current) stressOverlayRef.current.setOpacity(val);
  };

  // Execute End-to-End Analysis
  const handleRunAnalysis = async () => {
    const fieldId = selectedField?.id || (fields.length > 0 ? fields[0].id : 1);
    const geo = getGeoJsonFromDrawnPoints();

    setIsAnalyzing(true);
    setAnalysisStep('Initiating Copernicus Sentinel-2 MSI Multi-Spectral Query...');

    try {
      setTimeout(() => setAnalysisStep('Filtering Cloud Mask & Usable Surface Radiance...'), 700);
      setTimeout(() => setAnalysisStep('Extracting Band 4 (Red 665nm) & Band 8 (NIR 842nm)...'), 1400);
      setTimeout(() => setAnalysisStep('Computing NDVI = (NIR - Red) / (NIR + Red) & Stress Zones...'), 2100);

      const summary = await satelliteApi.analyzeField(fieldId, {
        geometry: geo,
        scene_id: selectedSceneId || undefined,
        max_cloud_cover: cloudCoverThreshold,
      });

      setHealthSummary(summary);
      if (onAnalysisComplete) onAnalysisComplete(summary);

      // Extract coords from field_geometry if drawnPoints was empty
      let analysisCoords = drawnPoints;
      if (analysisCoords.length < 3 && summary.field_geometry?.coordinates?.[0]) {
        const pts = summary.field_geometry.coordinates[0];
        analysisCoords = pts.map((p: [number, number]) => [p[1], p[0]]);
        setDrawnPoints(analysisCoords);
        renderPolygonOnMap(analysisCoords);
      }

      // Default to showing NDVI heatmap immediately
      const mode = activeOverlay === 'none' ? 'ndvi' : activeOverlay;
      setActiveOverlay(mode);
      applyRasterOverlays(summary, analysisCoords, mode);
    } catch (err) {
      console.error('Failed to run satellite analysis', err);
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner: Location & Field Context */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl glass-panel border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">
                {selectedField ? selectedField.name : 'Target Field Selection'}
              </h2>
              {healthSummary?.is_demo && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  DEMO DATA
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {calculatedArea > 0
                ? `Selected Field Area: ${calculatedArea} hectares (${drawnPoints.length} boundary points)`
                : 'Click map points to draw boundary or select an existing field.'}
            </p>
          </div>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* GPS Location Button */}
          <button
            onClick={() => requestDeviceLocation()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 text-xs font-semibold transition"
            title="Detect GPS location"
          >
            <Crosshair className="w-4 h-4" />
            <span>Use Current Location</span>
          </button>

          {/* Draw Field Boundary Button */}
          {!isDrawing ? (
            <button
              onClick={handleStartDrawing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-700 text-xs font-semibold transition"
            >
              <Maximize2 className="w-4 h-4" />
              <span>{drawnPoints.length > 0 ? 'Re-Draw Boundary' : 'Draw Field Boundary'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleFinishDrawing}
                disabled={drawnPoints.length < 3}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Field ({drawnPoints.length})</span>
              </button>
              <button
                onClick={handleResetDrawing}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
                title="Cancel drawing"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Run Analysis Button */}
          <button
            onClick={handleRunAnalysis}
            disabled={isAnalyzing || isDrawing || (drawnPoints.length < 3 && !selectedField)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 text-xs font-bold shadow-glow-cyan hover:brightness-110 active:scale-95 transition disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Sentinel-2...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Analyze Field</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Location Permission Notification (if denied or error) */}
      {locationStatus === 'denied' && (
        <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Browser Location Access Denied</span>
            <p className="text-[11px] text-slate-300 mt-0.5">
              {locationErrorMsg} You can use the map controls to pan, zoom, or pick any registered field from the list below.
            </p>
          </div>
        </div>
      )}

      {/* Registered Fields Quick-Pill Switcher */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-semibold flex-shrink-0">My Fields:</span>
        {fields.map((f) => (
          <button
            key={f.id}
            onClick={() => onSelectField(f)}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition flex items-center gap-1.5 ${
              selectedField?.id === f.id
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <MapPin className="w-3 h-3 text-emerald-400" />
            <span>{f.name}</span>
            <span className="opacity-75 font-mono text-[10px]">({f.crop})</span>
          </button>
        ))}
      </div>

      {/* Main Interactive Map Canvas Container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-[16/9] min-h-[420px]">
        {/* Leaflet DOM container */}
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Top-Right Map Controls: Basemap & Layer Overlays */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
          {/* Basemap Toggle */}
          <div className="bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700 flex items-center gap-1 text-[11px]">
            <button
              onClick={() => toggleBasemap('satellite')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                basemapType === 'satellite' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => toggleBasemap('street')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                basemapType === 'street' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              Street
            </button>
          </div>

          {/* Raster Layer Mode Toggle */}
          <div className="bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700 space-y-1.5 text-[11px]">
            <span className="text-[10px] text-slate-400 font-semibold px-1 block uppercase tracking-wider">
              Layer Overlays
            </span>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => handleToggleOverlay('stress')}
                className={`px-2.5 py-1 rounded-lg font-semibold text-left flex items-center justify-between transition ${
                  activeOverlay === 'stress' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Stress Map (Classified)</span>
                {activeOverlay === 'stress' && <Check className="w-3 h-3 text-emerald-400" />}
              </button>
              <button
                onClick={() => handleToggleOverlay('ndvi')}
                className={`px-2.5 py-1 rounded-lg font-semibold text-left flex items-center justify-between transition ${
                  activeOverlay === 'ndvi' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>NDVI Heatmap (Continuous)</span>
                {activeOverlay === 'ndvi' && <Check className="w-3 h-3 text-cyan-400" />}
              </button>
              <button
                onClick={() => handleToggleOverlay('none')}
                className={`px-2.5 py-1 rounded-lg font-semibold text-left flex items-center justify-between transition ${
                  activeOverlay === 'none' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Raw Satellite Only</span>
                {activeOverlay === 'none' && <Check className="w-3 h-3 text-slate-300" />}
              </button>
            </div>

            {/* Opacity Slider */}
            {activeOverlay !== 'none' && (
              <div className="pt-1 border-t border-slate-800 px-1">
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Opacity</span>
                  <span className="font-mono">{(overlayOpacity * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={overlayOpacity}
                  onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 h-1 bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>

        {/* Bottom-Left Legend Banner */}
        <div className="absolute bottom-3 left-3 z-10 bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-700 text-xs shadow-xl max-w-sm">
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
              <span>Vegetation Stress Legend</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Sentinel-2 MSI</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="flex items-center gap-1.5 bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
              <div className="w-3 h-3 rounded bg-emerald-500 flex-shrink-0" />
              <div>
                <span className="font-bold text-emerald-400 block text-[10px]">Healthy</span>
                <span className="text-[9px] text-slate-400 font-mono">NDVI ≥ 0.60</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
              <div className="w-3 h-3 rounded bg-amber-400 flex-shrink-0" />
              <div>
                <span className="font-bold text-amber-300 block text-[10px]">Moderate</span>
                <span className="text-[9px] text-slate-400 font-mono">0.35 - 0.60</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
              <div className="w-3 h-3 rounded bg-rose-500 flex-shrink-0" />
              <div>
                <span className="font-bold text-rose-400 block text-[10px]">High Stress</span>
                <span className="text-[9px] text-slate-400 font-mono">NDVI &lt; 0.35</span>
              </div>
            </div>
          </div>

          {/* Continuous NDVI Color Ramp Bar */}
          {activeOverlay === 'ndvi' && (
            <div className="mt-2.5 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between text-[9px] font-mono text-slate-400 mb-1">
                <span className="text-rose-400 font-semibold">&lt;0.35 Severe</span>
                <span className="text-amber-400 font-semibold">0.35–0.60 Moderate</span>
                <span className="text-emerald-400 font-semibold">&ge;0.60 Healthy</span>
              </div>
              <div
                className="h-2 rounded-full w-full shadow-inner"
                style={{
                  background: 'linear-gradient(to right, rgb(220,38,38) 0%, rgb(245,158,11) 38%, rgb(234,179,8) 55%, rgb(132,204,22) 70%, rgb(21,128,61) 100%)',
                }}
              />
            </div>
          )}
        </div>

        {/* Processing Spinner Overlay */}
        {isAnalyzing && (
          <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <div className="relative mb-4">
              <div className="w-16 h-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
              <Compass className="w-8 h-8 text-cyan-400 absolute inset-0 m-auto" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Processing Satellite Multispectral Bands</h3>
            <p className="text-xs text-cyan-300 font-mono animate-pulse max-w-md">
              {analysisStep || 'Calculating surface reflectance & NDVI vegetation indices...'}
            </p>
          </div>
        )}
      </div>

      {/* Field Health Summary Card (Dynamic Production Metrics) */}
      {healthSummary && (
        <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Field Health Summary
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  Acquired: {healthSummary.acquisition_date}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mt-0.5">
                {healthSummary.field_name} · {healthSummary.crop}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border ${
                healthSummary.high_stress_pct > 20
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : healthSummary.moderate_stress_pct > 25
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                {healthSummary.status}
              </span>
            </div>
          </div>

          {/* Metric KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
              <span className="text-xs text-slate-400 font-medium block">Average NDVI</span>
              <p className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                {healthSummary.ndvi_mean.toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Range: {healthSummary.ndvi_min.toFixed(2)} - {healthSummary.ndvi_max.toFixed(2)}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
              <span className="text-xs text-slate-400 font-medium block">Healthy Canopy</span>
              <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                {healthSummary.healthy_area_pct}%
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Optimal vigor & greenness</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
              <span className="text-xs text-slate-400 font-medium block">Moderate Stress</span>
              <p className="text-2xl font-bold font-mono text-amber-400 mt-1">
                {healthSummary.moderate_stress_pct}%
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Early chlorosis / moisture drop</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
              <span className="text-xs text-slate-400 font-medium block">High Stress Area</span>
              <p className="text-2xl font-bold font-mono text-rose-400 mt-1">
                {healthSummary.high_stress_pct}%
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Requires ground scout</p>
            </div>
          </div>

          {/* Scientific Disclaimer & Advisory Banner */}
          <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-cyan-300 font-semibold">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>Scientific Advisory & Diagnostic Scope:</span>
            </div>
            <p className="text-slate-300 leading-relaxed pl-6">
              {healthSummary.recommendation || healthSummary.headline}
            </p>
            <p className="text-[11px] text-slate-400 italic leading-relaxed pl-6 border-t border-slate-800/80 pt-2">
              {healthSummary.disclaimer}
            </p>
          </div>

          {/* Ground Scouting Next Step Button */}
          {onNavigateToLeafScan && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => onNavigateToLeafScan(healthSummary.field_id)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-glow-emerald"
              >
                <ScanLine className="w-4 h-4" />
                <span>Verify High-Stress Zones with Leaf AI (Grad-CAM)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
