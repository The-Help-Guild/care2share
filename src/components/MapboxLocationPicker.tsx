import { useState, useRef, useEffect } from "react";
import Map, { Marker, NavigationControl, GeolocateControl } from "react-map-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import { MapPin } from "lucide-react";
import { Label } from "./ui/label";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

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
  const mapRef = useRef<any>(null);
  const geocoderContainerRef = useRef<HTMLDivElement>(null);
  const [viewState, setViewState] = useState({
    longitude: initialLocation?.longitude || -122.4194,
    latitude: initialLocation?.latitude || 37.7749,
    zoom: initialLocation ? 14 : 10,
  });
  const [marker, setMarker] = useState<{ longitude: number; latitude: number } | null>(
    initialLocation
      ? { longitude: initialLocation.longitude, latitude: initialLocation.latitude }
      : null
  );
  const [selectedAddress, setSelectedAddress] = useState(initialLocation?.address || "");

  useEffect(() => {
    if (!geocoderContainerRef.current || !MAPBOX_TOKEN) return;

    const geocoder = new MapboxGeocoder({
      accessToken: MAPBOX_TOKEN,
      mapboxgl: mapRef.current?.getMap(),
      marker: false,
      placeholder: "Search for a location...",
    });

    geocoder.on("result", (e: any) => {
      const { center, place_name } = e.result;
      const [longitude, latitude] = center;
      
      setMarker({ longitude, latitude });
      setSelectedAddress(place_name);
      setViewState((prev) => ({
        ...prev,
        longitude,
        latitude,
        zoom: 14,
      }));
      
      onChange({
        address: place_name,
        latitude,
        longitude,
      });
    });

    geocoderContainerRef.current.appendChild(geocoder.onAdd(mapRef.current?.getMap()));

    return () => {
      geocoder.onRemove();
    };
  }, [onChange]);

  const handleMapClick = async (event: any) => {
    const { lngLat } = event;
    const longitude = lngLat.lng;
    const latitude = lngLat.lat;

    setMarker({ longitude, latitude });

    // Reverse geocode to get address
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
  };

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
      <div className="h-[400px] rounded-lg overflow-hidden border border-border">
        <Map
          ref={mapRef}
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          mapboxAccessToken={MAPBOX_TOKEN}
          onClick={handleMapClick}
        >
          <NavigationControl position="top-right" />
          <GeolocateControl
            position="top-right"
            trackUserLocation
            onGeolocate={(e: any) => {
              const longitude = e.coords.longitude;
              const latitude = e.coords.latitude;
              
              setMarker({ longitude, latitude });
              handleMapClick({ lngLat: { lng: longitude, lat: latitude } });
            }}
          />
          
          {marker && (
            <Marker
              longitude={marker.longitude}
              latitude={marker.latitude}
              anchor="bottom"
            >
              <MapPin className="h-8 w-8 text-primary fill-primary" />
            </Marker>
          )}
        </Map>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Search for a location, click on the map, or use the location button to set your precise location.
      </p>
    </div>
  );
};

