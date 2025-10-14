import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface UserLocation {
  id: string;
  full_name: string;
  location: string;
  latitude: number;
  longitude: number;
  profile_photo_url?: string;
}

interface UserMapProps {
  users: UserLocation[];
}

const UserMap: React.FC<UserMapProps> = ({ users }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = 'pk.eyJ1IjoicGl4ZWxzdG9wcm9maXQiLCJhIjoiY21ncWxsazVvMTJpcjJscXc5aWR6bzdoNSJ9._zmgx8h8bMR9Q2i8XpjAvw';
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [5.2913, 52.1326], // Center of Netherlands
      zoom: 6.5,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: false,
      }),
      'top-right'
    );

    // Add markers for each user with valid coordinates
    users.forEach((user) => {
      if (user.latitude && user.longitude && map.current) {
        const el = document.createElement('div');
        el.className = 'marker';
        el.style.backgroundImage = user.profile_photo_url 
          ? `url(${user.profile_photo_url})` 
          : 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)))';
        el.style.width = '40px';
        el.style.height = '40px';
        el.style.borderRadius = '50%';
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
        el.style.border = '3px solid white';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        el.style.cursor = 'pointer';

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<div style="padding: 8px;">
            <h3 style="font-weight: bold; margin-bottom: 4px;">${user.full_name}</h3>
            <p style="font-size: 14px; color: #666;">${user.location}</p>
          </div>`
        );

        new mapboxgl.Marker(el)
          .setLngLat([user.longitude, user.latitude])
          .setPopup(popup)
          .addTo(map.current);
      }
    });
  }, [users]);

  useEffect(() => {
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Member Locations - {users.filter(u => u.latitude && u.longitude).length} visible
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={mapContainer} className="w-full h-[400px] rounded-b-lg" />
      </CardContent>
    </Card>
  );
};

export default UserMap;
