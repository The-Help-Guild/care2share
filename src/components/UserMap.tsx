import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getLocationAddress, getLocationCoordinates } from '@/lib/locationHelpers';

interface UserLocation {
  id: string;
  full_name: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  profile_photo_url?: string;
  profile_domains?: Array<{ domains: { name: string } }>;
}

interface UserMapProps {
  users: UserLocation[];
}

const UserMap: React.FC<UserMapProps> = ({ users }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [geocodedUsers, setGeocodedUsers] = useState<UserLocation[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const getUserId = async () => {
      setIsLoadingAuth(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setCurrentUserId(session.user.id);
      setIsLoadingAuth(false);
    };
    getUserId();
  }, []);

  const handleContactUser = async (userId: string) => {
    if (!currentUserId) {
      toast.error("Please log in to contact users");
      return;
    }
    
    try {
      const { data: convId, error } = await supabase.rpc('start_conversation' as any, {
        target_user: userId,
      });
      
      if (error) throw error;
      navigate(`/messages?conversation=${convId}`);
      toast.success("Opening conversation...");
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast.error("Failed to start conversation");
    }
  };

  // Parse user locations (now stored as JSON with coordinates)
  useEffect(() => {
    const parseLocations = async () => {
      if (users.length === 0) return;
      
      setIsGeocoding(true);
      const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoicGl4ZWxzdG9wcm9maXQiLCJhIjoiY21ncWxsazVvMTJpcjJscXc5aWR6bzdoNSJ9._zmgx8h8bMR9Q2i8XpjAvw';
      
      const geocoded = await Promise.all(
        users.map(async (user) => {
          // If user already has coordinates in separate fields, use them
          if (user.latitude && user.longitude) {
            return user;
          }
          
          // Try to parse location JSON format
          const coordinates = getLocationCoordinates(user.location);
          if (coordinates) {
            return {
              ...user,
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
            };
          }
          
          // Fallback: geocode the location string (for old format)
          if (user.location) {
            const locationAddress = getLocationAddress(user.location);
            try {
              const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationAddress + ', Netherlands')}.json?access_token=${MAPBOX_TOKEN}&limit=1`
              );
              const data = await response.json();
              
              if (data.features && data.features.length > 0) {
                const [longitude, latitude] = data.features[0].center;
                return { ...user, latitude, longitude };
              }
            } catch (error) {
              console.error(`Failed to geocode ${locationAddress}:`, error);
            }
          }
          
          return user;
        })
      );
      
      setGeocodedUsers(geocoded.filter(u => u.latitude && u.longitude));
      setIsGeocoding(false);
    };
    
    parseLocations();
  }, [users]);

  useEffect(() => {
    // Don't initialize map until auth is loaded
    if (!mapContainer.current || map.current || geocodedUsers.length === 0 || isLoadingAuth) return;

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

        const domains = user.profile_domains?.slice(0, 3).map(pd => pd.domains.name).join(', ') || 'No specialties listed';
        const moreCount = user.profile_domains && user.profile_domains.length > 3 ? ` +${user.profile_domains.length - 3} more` : '';
        
        const popupContent = document.createElement('div');
        const locationDisplay = getLocationAddress(user.location);
        popupContent.innerHTML = `
          <div style="padding: 12px; min-width: 200px;">
            <h3 style="font-weight: bold; margin-bottom: 8px; font-size: 16px;">${user.full_name}</h3>
            <p style="font-size: 13px; color: #666; margin-bottom: 8px;">📍 ${locationDisplay}</p>
            <div style="background: #f3f4f6; padding: 8px; border-radius: 6px; margin-bottom: 10px;">
              <p style="font-size: 12px; color: #374151; font-weight: 500;">Specialties:</p>
              <p style="font-size: 12px; color: #6b7280; margin-top: 4px;">${domains}${moreCount}</p>
            </div>
            <button 
              id="contact-${user.id}" 
              style="
                width: 100%;
                background: hsl(221.2 83.2% 53.3%);
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
                font-size: 14px;
                transition: background 0.2s;
              "
              onmouseover="this.style.background='hsl(221.2 83.2% 48%)'"
              onmouseout="this.style.background='hsl(221.2 83.2% 53.3%)'"
            >
              💬 Contact ${user.full_name.split(' ')[0]}
            </button>
          </div>
        `;

        const popup = new mapboxgl.Popup({ offset: 25, maxWidth: '300px' })
          .setDOMContent(popupContent);

        // Add click event to contact button
        popup.on('open', () => {
          const contactBtn = document.getElementById(`contact-${user.id}`);
          if (contactBtn && currentUserId !== user.id) {
            contactBtn.addEventListener('click', () => handleContactUser(user.id));
          } else if (contactBtn && currentUserId === user.id) {
            contactBtn.textContent = "This is you!";
            contactBtn.style.background = '#9ca3af';
            contactBtn.style.cursor = 'not-allowed';
          }
        });

        new mapboxgl.Marker(el)
          .setLngLat([user.longitude, user.latitude])
          .setPopup(popup)
          .addTo(map.current);
      }
    });
  }, [geocodedUsers, currentUserId, navigate, isLoadingAuth]);

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
          Member Locations - {isGeocoding || isLoadingAuth ? 'Loading...' : `${geocodedUsers.length} visible`}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={mapContainer} className="w-full h-[400px] rounded-b-lg" />
      </CardContent>
    </Card>
  );
};

export default UserMap;
