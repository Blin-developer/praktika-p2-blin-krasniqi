import React, { useState, useMemo } from 'react';
import { MapPin, Store, Navigation, Plus, Minus, LocateFixed, ExternalLink, AlertCircle } from 'lucide-react';

/**
 * Konverton koordinatat (lat, lng) në pozicion pikselësh në projeksionin Web Mercator (OSM Slippy Tiles).
 */
function latLngToWorldPx(lat, lng, zoom) {
  const scale = 256 * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
}

export default function DeliveryMap({
  pickup,      // { lat, lng, label, address }
  dropoff,     // { lat, lng, label, address }
  courier,     // { lat, lng, label, lastUpdated }
  etaMinutes,
  height = 280,
}) {
  const validPickup = pickup?.lat != null && pickup?.lng != null;
  const validDropoff = dropoff?.lat != null && dropoff?.lng != null;
  const validCourier = courier?.lat != null && courier?.lng != null;

  // Qendra fillestare e hartës bazohet vetëm në koordinatat reale ekzistuese
  const initialCenter = useMemo(() => {
    const pts = [];
    if (validCourier) pts.push({ lat: Number(courier.lat), lng: Number(courier.lng) });
    if (validPickup) pts.push({ lat: Number(pickup.lat), lng: Number(pickup.lng) });
    if (validDropoff) pts.push({ lat: Number(dropoff.lat), lng: Number(dropoff.lng) });

    if (pts.length === 0) return null;
    const sumLat = pts.reduce((s, p) => s + p.lat, 0);
    const sumLng = pts.reduce((s, p) => s + p.lng, 0);
    return { lat: sumLat / pts.length, lng: sumLng / pts.length };
  }, [validCourier, validPickup, validDropoff, courier?.lat, courier?.lng, pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng]);

  const [zoom, setZoom] = useState(14);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [tileErrors, setTileErrors] = useState(0);

  if (!initialCenter) {
    return (
      <div style={{
        height: `${height}px`,
        borderRadius: '14px',
        background: '#f8fafc',
        border: '1px dashed #cbd5e1',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        textAlign: 'center',
        color: '#64748b'
      }}>
        <MapPin size={28} style={{ color: '#94a3b8', marginBottom: '8px' }} />
        <div style={{ fontWeight: 700, fontSize: '14px', color: '#18181b' }}>
          Koordinatat GPS nuk janë të disponueshme ende
        </div>
        <div style={{ fontSize: '12.5px', marginTop: '4px', maxWidth: '320px' }}>
          Harta interaktive do të shfaqë pozicionin sapo të regjistrohen koordinatat reale të degës ose korrierit.
        </div>
      </div>
    );
  }

  const centerWorld = latLngToWorldPx(initialCenter.lat, initialCenter.lng, zoom);
  const viewWidth = 640;
  const viewHeight = height;

  // Llogaritja e pllakave (tiles) të OpenStreetMap rreth qendrës
  const tileSize = 256;
  const maxTile = Math.pow(2, zoom);
  const originWorldX = centerWorld.x - viewWidth / 2 - panOffset.x;
  const originWorldY = centerWorld.y - viewHeight / 2 - panOffset.y;

  const startTileX = Math.floor(originWorldX / tileSize);
  const endTileX = Math.floor((originWorldX + viewWidth) / tileSize);
  const startTileY = Math.floor(originWorldY / tileSize);
  const endTileY = Math.floor((originWorldY + viewHeight) / tileSize);

  const tiles = [];
  for (let tx = startTileX; tx <= endTileX; tx++) {
    for (let ty = startTileY; ty <= endTileY; ty++) {
      if (ty < 0 || ty >= maxTile) continue;
      const wrappedX = ((tx % maxTile) + maxTile) % maxTile;
      tiles.push({
        key: `${zoom}-${tx}-${ty}`,
        url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${ty}.png`,
        left: tx * tileSize - originWorldX,
        top: ty * tileSize - originWorldY,
      });
    }
  }

  const projectPoint = (lat, lng) => {
    const wp = latLngToWorldPx(Number(lat), Number(lng), zoom);
    return {
      x: wp.x - originWorldX,
      y: wp.y - originWorldY,
    };
  };

  const pickupPt = validPickup ? projectPoint(pickup.lat, pickup.lng) : null;
  const dropoffPt = validDropoff ? projectPoint(dropoff.lat, dropoff.lng) : null;
  const courierPt = validCourier ? projectPoint(courier.lat, courier.lng) : null;

  const handleMouseDown = (e) => {
    setDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    setPanOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setDragging(false);

  const googleMapsUrl = validDropoff
    ? `https://www.google.com/maps/dir/?api=1&destination=${dropoff.lat},${dropoff.lng}`
    : (validPickup ? `https://www.google.com/maps/search/?api=1&query=${pickup.lat},${pickup.lng}` : null);

  return (
    <div style={{
      position: 'relative',
      height: `${height}px`,
      borderRadius: '14px',
      overflow: 'hidden',
      border: '1px solid #e2e8f0',
      backgroundColor: '#eef2f6',
      userSelect: 'none',
      cursor: dragging ? 'grabbing' : 'grab',
    }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Grid fallback nëse pllakat nuk ngarkohen offline */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'linear-gradient(to right, rgba(148,163,184,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.15) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />

      {/* OpenStreetMap Tiles */}
      {tileErrors < 6 && tiles.map((t) => (
        <img
          key={t.key}
          src={t.url}
          alt=""
          draggable={false}
          onError={() => setTileErrors((c) => c + 1)}
          style={{
            position: 'absolute',
            left: `${t.left}px`,
            top: `${t.top}px`,
            width: `${tileSize}px`,
            height: `${tileSize}px`,
            pointerEvents: 'none',
            opacity: 0.92,
          }}
        />
      ))}

      {/* Vija e Rrugës (SVG Route Line) */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        {pickupPt && courierPt && (
          <line
            x1={pickupPt.x}
            y1={pickupPt.y}
            x2={courierPt.x}
            y2={courierPt.y}
            stroke="#0066ff"
            strokeWidth="3"
            strokeDasharray="6 4"
          />
        )}
        {courierPt && dropoffPt && (
          <line
            x1={courierPt.x}
            y1={courierPt.y}
            x2={dropoffPt.x}
            y2={dropoffPt.y}
            stroke="#10b981"
            strokeWidth="3"
            strokeDasharray="6 4"
          />
        )}
        {!courierPt && pickupPt && dropoffPt && (
          <line
            x1={pickupPt.x}
            y1={pickupPt.y}
            x2={dropoffPt.x}
            y2={dropoffPt.y}
            stroke="#0066ff"
            strokeWidth="2.5"
            strokeDasharray="5 5"
          />
        )}
      </svg>

      {/* Pin: Restoranti */}
      {pickupPt && (
        <div
          style={{
            position: 'absolute',
            left: `${pickupPt.x}px`,
            top: `${pickupPt.y}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <div style={{
            background: '#18181b',
            color: '#fff',
            padding: '4px 8px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Store size={12} />
            <span>{pickup.label || 'Restoranti'}</span>
          </div>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#18181b', border: '2px solid #fff', margin: '2px auto 0' }} />
        </div>
      )}

      {/* Pin: Klienti */}
      {dropoffPt && (
        <div
          style={{
            position: 'absolute',
            left: `${dropoffPt.x}px`,
            top: `${dropoffPt.y}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <div style={{
            background: '#10b981',
            color: '#fff',
            padding: '4px 8px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 10px rgba(16,185,129,0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <MapPin size={12} />
            <span>{dropoff.label || 'Klienti'}</span>
          </div>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', border: '2px solid #fff', margin: '2px auto 0' }} />
        </div>
      )}

      {/* Pin: Korrieri Live */}
      {courierPt && (
        <div
          style={{
            position: 'absolute',
            left: `${courierPt.x}px`,
            top: `${courierPt.y}px`,
            transform: 'translate(-50%, -50%)',
            zIndex: 20,
            pointerEvents: 'none',
          }}
        >
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: '#0066ff',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '3px solid #fff',
            boxShadow: '0 0 0 6px rgba(0,102,255,0.22), 0 4px 12px rgba(0,102,255,0.4)',
          }}>
            <Navigation size={15} />
          </div>
          <div style={{
            marginTop: '3px',
            background: '#0066ff',
            color: '#fff',
            padding: '2px 7px',
            borderRadius: '6px',
            fontSize: '10.5px',
            fontWeight: 700,
            textAlign: 'center',
            whiteSpace: 'nowrap',
          }}>
            {courier.label || 'Korrieri'}
          </div>
        </div>
      )}

      {/* Kontrolli i Zoom-it dhe Qendrës */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          zIndex: 30,
        }}
      >
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(18, z + 1))}
          style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          title="Zmadho"
        >
          <Plus size={14} />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(10, z - 1))}
          style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          title="Zvogëlo"
        >
          <Minus size={14} />
        </button>
        <button
          type="button"
          onClick={() => setPanOffset({ x: 0, y: 0 })}
          style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          title="Qendërzo hartën"
        >
          <LocateFixed size={14} />
        </button>
      </div>

      {/* Info Bar poshtë */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          right: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          zIndex: 30,
          pointerEvents: 'none',
        }}
      >
        <div style={{
          background: 'rgba(24,24,27,0.88)',
          color: '#fff',
          padding: '5px 10px',
          borderRadius: '8px',
          fontSize: '11.5px',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          pointerEvents: 'auto',
        }}>
          {validCourier ? (
            <>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#34d399' }} />
              <span>
                GPS Live {etaMinutes ? `• ETA ~${etaMinutes} min` : ''}
              </span>
            </>
          ) : (
            <>
              <AlertCircle size={13} color="#fbbf24" />
              <span>Vendndodhja GPS e korrierit nuk është ndarë ende</span>
            </>
          )}
        </div>

        {googleMapsUrl && (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#fff',
              color: '#0066ff',
              padding: '5px 10px',
              borderRadius: '8px',
              fontSize: '11.5px',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              pointerEvents: 'auto',
            }}
          >
            <ExternalLink size={12} />
            <span>Hap në Hartë</span>
          </a>
        )}
      </div>
    </div>
  );
}
