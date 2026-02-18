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

// Helper to generate consistent colors for routes using Golden Angle approximation
// This ensures that even with 500+ routes, colors are as distinct as possible.
const getRouteColors = (routes) => {
    const uniqueRoutes = [...new Set(routes)].sort(); // Sort for deterministic assignment
    const colorMap = {};
    
    uniqueRoutes.forEach((route, index) => {
        // Golden Angle ≈ 137.508°
        // Using this angle prevents color cycles from aligning with simple fractions of the circle
        const hue = (index * 137.508) % 360; 
        colorMap[route] = `hsl(${hue}, 75%, 45%)`; // High saturation, slightly dark for visibility on map
    });
    
    return colorMap;
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

export default function MapView({ api, branchFilter, routeFilter }) {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);

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
    }, [api, branchFilter, routeFilter]);

    // Group students by route for polylines
    const { routeGroups, routeColors } = useMemo(() => {
        const groups = {};
        const allRoutes = new Set();
        
        locations.forEach(student => {
            if (!groups[student.route_name]) {
                groups[student.route_name] = [];
            }
            groups[student.route_name].push(student);
            allRoutes.add(student.route_name);
        });
        
        const colors = getRouteColors(Array.from(allRoutes));
        
        return { routeGroups: groups, routeColors: colors };
    }, [locations]);

    // Calculate all points for bounds
    const allPoints = useMemo(() => 
        locations.map(s => [parseFloat(s.latitude), parseFloat(s.longitude)]), 
    [locations]);

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Map Data...</div>;

    // Default center (can be anywhere, will be overridden by RecenterAutomatically)
    const defaultCenter = [17.3850, 78.4867]; // Hyderabad approx

    return (
        <div style={{ height: '600px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #d4d4d4', zIndex: 0 }}>
            <MapContainer center={defaultCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* Auto-fit bounds */}
                <RecenterAutomatically points={allPoints} />

                {/* Draw Routes (Polylines) */}
                {Object.entries(routeGroups).map(([route, students]) => {
                    const color = routeColors[route] || '#333';
                    const positions = students.map(s => [parseFloat(s.latitude), parseFloat(s.longitude)]);
                    
                    return (
                        <Polyline 
                            key={route} 
                            positions={positions} 
                            pathOptions={{ color, weight: 4, opacity: 0.8 }} 
                        />
                    );
                })}

                {/* Draw Markers */}
                {locations.map((student, idx) => (
                    <Marker 
                        key={idx} 
                        position={[parseFloat(student.latitude), parseFloat(student.longitude)]}
                    >
                        <Popup>
                            <div style={{ minWidth: '150px' }}>
                                <strong>{student.student_name}</strong><br/>
                                <span style={{ fontSize: '0.85rem', color: '#666' }}>ID: {student.student_id}</span><br/>
                                <span style={{ fontSize: '0.85rem', color: '#666' }}>Route: {student.route_name}</span>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
