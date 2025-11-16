/**
 * Geocoding helper using Google Maps API through Manus proxy
 * Converts UK postcodes to GPS coordinates (latitude/longitude)
 */

import { makeRequest } from "./_core/map";

interface GeocodeResult {
  latitude: string;
  longitude: string;
  formattedAddress: string;
}

/**
 * Geocode a UK postcode to GPS coordinates
 * @param postcode - UK postcode (e.g., "SW1A 1AA", "M1 1AE")
 * @returns GPS coordinates and formatted address
 * @throws Error if postcode is invalid or geocoding fails
 */
export async function geocodePostcode(postcode: string): Promise<GeocodeResult> {
  if (!postcode || postcode.trim() === "") {
    throw new Error("Postcode is required");
  }

  try {
    // Use Google Maps Geocoding API through Manus proxy
    const response = await makeRequest(
      `/maps/api/geocode/json?address=${encodeURIComponent(postcode)}&region=uk&components=country:GB`
    ) as any;

    if (response.status !== "OK") {
      throw new Error(`Geocoding failed: ${response.status}`);
    }

    if (!response.results || response.results.length === 0) {
      throw new Error("No results found for postcode");
    }

    const result = response.results[0];
    const location = result.geometry.location;

    return {
      latitude: location.lat.toString(),
      longitude: location.lng.toString(),
      formattedAddress: result.formatted_address,
    };
  } catch (error) {
    console.error("Geocoding error:", error);
    throw new Error(`Failed to geocode postcode: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Batch geocode multiple postcodes
 * @param postcodes - Array of UK postcodes
 * @returns Array of geocode results (null for failed geocoding)
 */
export async function geocodePostcodes(postcodes: string[]): Promise<(GeocodeResult | null)[]> {
  const results: (GeocodeResult | null)[] = [];

  for (const postcode of postcodes) {
    try {
      const result = await geocodePostcode(postcode);
      results.push(result);
    } catch (error) {
      console.error(`Failed to geocode ${postcode}:`, error);
      results.push(null);
    }
  }

  return results;
}
