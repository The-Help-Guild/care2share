/**
 * Helper function to extract location address from profile location field
 * Handles both legacy string format and new JSON format with coordinates
 */
export const getLocationAddress = (location: string | null | undefined): string => {
  if (!location) return "";
  
  try {
    const parsed = JSON.parse(location);
    return parsed.address || location;
  } catch {
    // If parsing fails, it's the old string format
    return location;
  }
};

/**
 * Helper function to extract location coordinates from profile location field
 * Returns null if not available or in old format
 */
export const getLocationCoordinates = (location: string | null | undefined): {
  latitude: number;
  longitude: number;
} | null => {
  if (!location) return null;
  
  try {
    const parsed = JSON.parse(location);
    if (parsed.latitude && parsed.longitude) {
      return {
        latitude: parsed.latitude,
        longitude: parsed.longitude,
      };
    }
  } catch {
    // If parsing fails, it's the old string format
    return null;
  }
  
  return null;
};

