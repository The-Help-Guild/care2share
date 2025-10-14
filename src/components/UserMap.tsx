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
  latitude?: number | null;
  longitude?: number | null;
  profile_photo_url?: string;
}

interface UserMapProps {
  users: UserLocation[];
}

const UserMap: React.FC<UserMapProps> = ({ users }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [geocodedUsers, setGeocodedUsers] = useState<UserLocation[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Geocode user locations
  useEffect(() => {
    const geocodeUsers = async () => {
      if (users.length === 0) return;
      
      setIsGeocoding(true);
      const MAPBOX_TOKEN = 'pk.eyJ1IjoicGl4ZWxzdG9wcm9maXQiLCJhIjoiY21ncWxsazVvMTJpcjJscXc5aWR6bzdoNSJ9._zmgx8h8bMR9Q2i8XpjAvw';
      
      const geocoded = await Promise.all(
        users.map(async (user) => {
          // If user already has coordinates, use them
          if (user.latitude && user.longitude) {
            return user;
          }
          
          // Otherwise, geocode the location string
          if (user.location) {
            try {
              const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(user.location + ', Netherlands')}.json?access_token=${MAPBOX_TOKEN}&limit=1`
              );
              const data = await response.json();
              
              if (data.features && data.features.length > 0) {
                const [longitude, latitude] = data.features[0].center;
                return { ...user, latitude, longitude };
              }
            } catch (error) {
              console.error(`Failed to geocode ${user.location}:`, error);
            }
          }
          
          return user;
        })
      );
      
      setGeocodedUsers(geocoded.filter(u => u.latitude && u.longitude));
      setIsGeocoding(false);
    };
    
    geocodeUsers();
  }, [users]);

  useEffect(() => {
    if (!mapContainer.current || map.current || geocodedUsers.length === 0) return;

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

    // Add markers for each geocoded user
    geocodedUsers.forEach((user) => {
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
  }, [geocodedUsers]);

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
          Member Locations - {isGeocoding ? 'Loading...' : `${geocodedUsers.length} visible`}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={mapContainer} className="w-full h-[400px] rounded-b-lg" />
      </CardContent>
    </Card>
  );
};

export default UserMap;
