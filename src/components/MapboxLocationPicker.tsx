import { useState, useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import { MapPin } from "lucide-react";
import { Label } from "./ui/label";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoicGl4ZWxzdG9wcm9maXQiLCJhIjoiY21ncWxsazVvMTJpcjJscXc5aWR6bzdoNSJ9._zmgx8h8bMR9Q2i8XpjAvw';

interface LocationData {
  address: string;
  latitude: number;
  longitude: number;
}

interface MapboxLocationPickerProps {
  initialLocation?: LocationData | null;
  onChange: (location: LocationData) => void;
  label?: string;
}

export const MapboxLocationPicker = ({
  initialLocation,
  onChange,
  label = "Location",
}: MapboxLocationPickerProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const geocoderContainerRef = useRef<HTMLDivElement>(null);
  const [selectedAddress, setSelectedAddress] = useState(initialLocation?.address || "");

  useEffect(() => {
    if (!mapContainerRef.current || !MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    // Initialize map
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [
        initialLocation?.longitude || -122.4194,
        initialLocation?.latitude || 37.7749,
      ],
      zoom: initialLocation ? 14 : 10,
    });

    mapRef.current = map;

    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
      }),
      "top-right"
    );

    // Add initial marker if exists
    if (initialLocation) {
      const marker = new mapboxgl.Marker()
        .setLngLat([initialLocation.longitude, initialLocation.latitude])
        .addTo(map);
      markerRef.current = marker;
    }

    // Add geocoder
    if (geocoderContainerRef.current) {
      const geocoder = new MapboxGeocoder({
        accessToken: MAPBOX_TOKEN,
        mapboxgl: mapboxgl,
        marker: false,
        placeholder: "Search for a location...",
      });

      geocoder.on("result", (e: any) => {
        const { center, place_name } = e.result;
        const [longitude, latitude] = center;

        // Remove old marker
        if (markerRef.current) {
          markerRef.current.remove();
        }

        // Add new marker
        const marker = new mapboxgl.Marker()
          .setLngLat([longitude, latitude])
          .addTo(map);
        markerRef.current = marker;

        setSelectedAddress(place_name);
        map.flyTo({ center: [longitude, latitude], zoom: 14 });

        onChange({
          address: place_name,
          latitude,
          longitude,
        });
      });

      geocoderContainerRef.current.appendChild(geocoder.onAdd(map));
    }

    // Handle map clicks
    map.on("click", async (e) => {
      const { lng: longitude, lat: latitude } = e.lngLat;

      // Remove old marker
      if (markerRef.current) {
        markerRef.current.remove();
      }

      // Add new marker
      const marker = new mapboxgl.Marker()
        .setLngLat([longitude, latitude])
        .addTo(map);
      markerRef.current = marker;

      // Reverse geocode
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}`
        );
        const data = await response.json();
        const address = data.features[0]?.place_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

        setSelectedAddress(address);
        onChange({
          address,
          latitude,
          longitude,
        });
      } catch (error) {
        console.error("Error reverse geocoding:", error);
        const address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        setSelectedAddress(address);
        onChange({
          address,
          latitude,
          longitude,
        });
      }
    });

    return () => {
      map.remove();
    };
  }, []);


  if (!MAPBOX_TOKEN) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="border border-destructive rounded-md p-4 text-sm text-destructive">
          Mapbox token is not configured. Please add VITE_MAPBOX_TOKEN to your environment variables.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      {/* Search box */}
      <div ref={geocoderContainerRef} className="mapbox-geocoder-container" />
      
      {/* Selected address display */}
      {selectedAddress && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-2 rounded-md">
          <MapPin className="h-4 w-4" />
          <span>{selectedAddress}</span>
        </div>
      )}
      
      {/* Map */}
      <div 
        ref={mapContainerRef}
        className="h-[400px] rounded-lg overflow-hidden border border-border"
      />
      
      <p className="text-xs text-muted-foreground">
        Search for a location, click on the map, or use the location button to set your precise location.
      </p>
    </div>
  );
};

