import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import L from 'leaflet';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

function LocationMarker({ position, setPosition }) {
    const map = useMapEvents({
        click(e) {
            setPosition(e.latlng);
            map.flyTo(e.latlng, map.getZoom());
        },
    });

    return position === null ? null : (
        <Marker 
            position={position} 
            draggable={true} 
            eventHandlers={{
                dragend: (e) => {
                    setPosition(e.target.getLatLng());
                }
            }}
        >
            <Popup>Selected Location</Popup>
        </Marker>
    );
}

export default function MapView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [student, setStudent] = useState(null);
    const [position, setPosition] = useState(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStudent = async () => {
            try {
                const res = await fetch(`/api/students/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setStudent(data);
                    if (data.latitude && data.longitude) {
                        setPosition({ lat: parseFloat(data.latitude), lng: parseFloat(data.longitude) });
                    }
                } else {
                    alert('Student not found');
                    // navigate('/');
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchStudent();
    }, [id]);

    const handleSave = async () => {
        if (!position) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/students/${id}/location`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ latitude: position.lat, longitude: position.lng })
            });

            if (res.ok) {
                alert('Location saved successfully!');
            } else {
                alert('Failed to save location.');
            }
        } catch (error) {
            console.error(error);
            alert('Error saving location.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    if (!student) return <div className="p-8 text-center">Student not found</div>;

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] space-y-4">
            <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => navigate(-1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <h2 className="text-xl font-bold">{student.name} - Stop Location</h2>
                <Button onClick={handleSave} disabled={!position || saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {saving ? 'Saving...' : 'Save Location'}
                </Button>
            </div>
            
            <Card className="flex-1 overflow-hidden border rounded-lg relative z-0">
                 <MapContainer 
                    center={position || { lat: 17.3850, lng: 78.4867 }} 
                    zoom={13} 
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <LocationMarker position={position} setPosition={setPosition} />
                </MapContainer>
            </Card>
            <div className="text-sm text-muted-foreground text-center">
                Click on the map or drag the marker to set the stop location.
            </div>
        </div>
    );
}
