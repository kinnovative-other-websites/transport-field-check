import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';

// Fix for default Leaflet marker icons in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Helper: Decode Google Polyline encoded string
const decodePolyline = (encoded) => {
    if (!encoded) return [];
    var points = [];
    var index = 0, len = encoded.length;
    var lat = 0, lng = 0;
    while (index < len) {
        var b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        var dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;
        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        var dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;
        points.push([lat / 1e5, lng / 1e5]);
    }
    return points;
};

// Helper: Create a numbered icon
const createNumberedIcon = (number) => {
    return L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #c42b2bff; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; justify-content: center; align-items: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${number}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
};

// Component to auto-fit map bounds
const RecenterAutomatically = ({ points }) => {
    const map = useMap();
    useEffect(() => {
        if (points.length > 0) {
            const bounds = L.latLngBounds(points);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [points, map]);
    return null;
};

export default function MapView({ api, branchFilter, routeFilter, mapVersion }) {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [optimizedRoute, setOptimizedRoute] = useState(null);

    useEffect(() => {
        const fetchLocations = async () => {
            setLoading(true);
            try {
                const params = {};
                if (branchFilter) params.branch = branchFilter;
                if (routeFilter) params.route = routeFilter;
                
                const res = await api.get('/api/locations', { params });
                setLocations(res.data);
            } catch (err) {
                console.error("Failed to fetch map data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchLocations();
    }, [api, branchFilter, routeFilter, mapVersion]); // Refetch locations too? Maybe not needed but harmless.

    // Fetch Optimized Route if filters are active
    useEffect(() => {
        if (!branchFilter || !routeFilter) {
            setOptimizedRoute(null);
            return;
        }
        const fetchOptimizedRoute = async () => {
            try {
                const res = await api.get('/api/optimized-route', {
                    params: { branch: branchFilter, route: routeFilter, v: mapVersion } // force refresh
                });
                if (res.data) {
                    setOptimizedRoute({
                        ...res.data,
                        decodedPath: decodePolyline(res.data.polyline)
                    });
                } else {
                    setOptimizedRoute(null);
                }
            } catch (err) {
                // console.error("Failed to fetch optimized route", err);
                setOptimizedRoute(null);
            }
        };
        fetchOptimizedRoute();
    }, [api, branchFilter, routeFilter, locations, mapVersion]); // Re-fetch on version change

    // Calculate all points for bounds
    const allPoints = useMemo(() => {
        const points = locations.map(s => [parseFloat(s.latitude), parseFloat(s.longitude)]);
        if (optimizedRoute && optimizedRoute.decodedPath) {
            return [...points, ...optimizedRoute.decodedPath];
        }
        return points;
    }, [locations, optimizedRoute]);

    // stop map for fast lookup
    const studentStops = useMemo(() => {
        if (!optimizedRoute || !optimizedRoute.stop_order) return {};
        const map = {};
        
        // Ensure stop_order is array
        let stops = optimizedRoute.stop_order;
        if (typeof stops === 'string') stops = JSON.parse(stops); // just in case

        stops.forEach((stop, index) => {
           map[stop.student_code] = index + 1;
        });
        return map;
    }, [optimizedRoute]);

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Map Data...</div>;

    const defaultCenter = [17.3850, 78.4867];

    return (
        <div style={{ height: '600px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #d4d4d4', zIndex: 0 }}>
            <MapContainer center={defaultCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                <RecenterAutomatically points={allPoints} />

                {/* Draw Optimized Route Key Polyline if available */}
                {optimizedRoute && optimizedRoute.decodedPath && (
                    <Polyline 
                        positions={optimizedRoute.decodedPath}
                        pathOptions={{ color: '#ef4444', weight: 5, opacity: 0.9 }} 
                    />
                )}

                {/* Draw Markers */}
                {locations.map((student, idx) => {
                    const stopNumber = studentStops[student.student_code];
                    const markerIcon = stopNumber ? createNumberedIcon(stopNumber) : DefaultIcon;

                    return (
                        <Marker 
                            key={idx} 
                            position={[parseFloat(student.latitude), parseFloat(student.longitude)]}
                            icon={markerIcon}
                        >
                            <Popup>
                                <div style={{ minWidth: '150px' }}>
                                    {stopNumber && <div style={{background: '#ef4444', color: 'white', display: 'inline-block', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px'}}>STOP #{stopNumber}</div>}
                                    <strong>{student.student_name}</strong><br/>
                                    <span style={{ fontSize: '0.85rem', color: '#666' }}>ID: {student.student_id}</span><br/>
                                    <span style={{ fontSize: '0.85rem', color: '#666' }}>Route: {student.route_name}</span>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
