import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from './Icon';
import { Modal } from './Modal';

export interface MapPickResult {
  address: string;
  link: string;
  lat: number;
  lng: number;
}

interface MapPickerProps {
  initialQuery?: string;
  onClose: () => void;
  onConfirm: (result: MapPickResult) => void;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

// Centro padrão: São Paulo (usado enquanto nada foi selecionado).
const DEFAULT_CENTER: [number, number] = [-23.55, -46.63];

function pinIcon() {
  const brand = getComputedStyle(document.body).getPropertyValue('--brand').trim() || '#FF169B';
  return L.divIcon({
    className: 'map-pin',
    html: `<svg width="32" height="32" viewBox="0 0 24 24" fill="${brand}" stroke="#fff" stroke-width="1.4" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z"/><circle cx="12" cy="9" r="2.6" fill="#fff" stroke="none"/></svg>`,
    iconSize: [32, 32],
    iconAnchor: [16, 30],
  });
}

export function MapPicker({ initialQuery, onClose, onConfirm }: MapPickerProps) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [query, setQuery] = useState(initialQuery ?? '');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<{ address: string; lat: number; lng: number } | null>(null);

  // Inicializa o mapa uma única vez.
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const map = L.map(mapEl.current, { attributionControl: true }).setView(DEFAULT_CENTER, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    map.on('click', (e) => placeMarker(e.latlng.lat, e.latlng.lng, true));
    mapRef.current = map;
    // O container só tem tamanho final após o modal montar.
    setTimeout(() => map.invalidateSize(), 60);
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function placeMarker(lat: number, lng: number, reverse: boolean) {
    const map = mapRef.current;
    if (!map) return;
    if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
    else markerRef.current = L.marker([lat, lng], { icon: pinIcon() }).addTo(map);

    if (reverse) {
      setSelected({ address: 'Buscando endereço…', lat, lng });
      fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
        headers: { 'Accept-Language': 'pt-BR' },
      })
        .then((r) => r.json())
        .then((d: { display_name?: string }) => {
          setSelected({ address: d.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng });
        })
        .catch(() => setSelected({ address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng }));
    }
  }

  async function doSearch() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&q=${encodeURIComponent(q)}`,
        { headers: { 'Accept-Language': 'pt-BR' } },
      );
      setResults(await res.json());
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function chooseResult(r: NominatimResult) {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    placeMarker(lat, lng, false);
    setSelected({ address: r.display_name, lat, lng });
    setResults([]);
    mapRef.current?.setView([lat, lng], 16);
  }

  function handleConfirm() {
    if (!selected) return;
    onConfirm({
      address: selected.address,
      link: `https://www.google.com/maps?q=${selected.lat},${selected.lng}`,
      lat: selected.lat,
      lng: selected.lng,
    });
  }

  return (
    <Modal title="Selecionar local no mapa" onClose={onClose} large>
      <div className="field" style={{ marginBottom: 10 }}>
        <label>Buscar endereço ou local</label>
        <div className="row gap8">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } }}
            placeholder="Ex: Espaço Villa Country, São Paulo"
            style={{ flex: 1 }}
          />
          <button className="btn btn-brand btn-sm" onClick={doSearch} disabled={searching}>
            <Icon name="search" size={14} />{searching ? 'Buscando…' : 'Buscar'}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div
          style={{
            border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10,
            maxHeight: 150, overflowY: 'auto', background: 'var(--surface-2)',
          }}
        >
          {results.map((r, i) => (
            <div
              key={`${r.lat}-${r.lon}-${i}`}
              onClick={() => chooseResult(r)}
              style={{ padding: '9px 12px', fontSize: 13, cursor: 'pointer', borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none' }}
            >
              {r.display_name}
            </div>
          ))}
        </div>
      )}

      <div ref={mapEl} style={{ height: 320, width: '100%', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }} />

      <div className="faint" style={{ fontSize: 11, marginTop: 6 }}>
        Dica: clique direto no mapa para marcar um ponto. Busca e mapa por OpenStreetMap.
      </div>

      {selected && (
        <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 13 }}>
          <div style={{ color: 'var(--text-dim)', fontSize: 11, marginBottom: 2 }}>Local selecionado</div>
          {selected.address}
        </div>
      )}

      <button className="btn btn-brand btn-full" style={{ marginTop: 14 }} onClick={handleConfirm} disabled={!selected}>
        Confirmar local
      </button>
    </Modal>
  );
}
