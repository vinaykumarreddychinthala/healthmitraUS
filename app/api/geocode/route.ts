import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/geocode?lat={lat}&lng={lng}
 *
 * Server-side proxy for Google Maps Reverse Geocoding API.
 * Keeps the API key out of the browser bundle.
 *
 * Google Maps component type hierarchy (most → least granular):
 *   sublocality_level_3 → sublocality_level_2 → sublocality_level_1 → sublocality → locality
 *
 * Example for Sector 62, Noida:
 *   sublocality_level_2 = "Sector 62"
 *   sublocality_level_1 = "Noida"
 *   locality            = "Noida"
 *   administrative_area_level_1 = "Uttar Pradesh"
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    if (!lat || !lng) {
        return NextResponse.json(
            { error: "lat and lng are required" },
            { status: 400 }
        );
    }

    const apiKey = process.env.GOOGLE_MAPS_API;
    if (!apiKey) {
        return NextResponse.json(
            { error: "Google Maps API key is not configured" },
            { status: 500 }
        );
    }

    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.status !== "OK" || !data.results?.length) {
            return NextResponse.json(
                { error: "No results found", status: data.status },
                { status: 422 }
            );
        }

        // Build a flat component map from ALL results (not just the first),
        // so we get the most specific types available.
        const components: Record<string, string> = {};
        for (const result of data.results as {
            address_components: { long_name: string; short_name: string; types: string[] }[];
        }[]) {
            for (const component of result.address_components) {
                for (const type of component.types) {
                    // Only store the first (most specific) occurrence of each type
                    if (!components[type]) {
                        components[type] = component.long_name;
                    }
                }
            }
        }

        const firstResult = data.results[0];

        /**
         * Sector / granular sublocality:
         * Google returns sectors/blocks at sublocality_level_2 or _level_3.
         * We pick the most granular available.
         */
        const sector =
            components["sublocality_level_3"] ||
            components["sublocality_level_2"] ||
            "";

        /**
         * Locality / neighbourhood:
         * sublocality_level_1 covers areas like "Noida", "Dwarka", "Banjara Hills", etc.
         * Fall back to plain sublocality, then neighbourhood.
         */
        const locality =
            components["sublocality_level_1"] ||
            components["sublocality"] ||
            components["neighborhood"] ||
            "";

        const parsed = {
            street: [
                components["premise"],
                components["street_number"],
                components["route"],
            ]
                .filter(Boolean)
                .join(", "),
            sector,    // e.g. "Sector 62"
            locality,  // e.g. "Noida" (sublocality_level_1)
            city:
                components["locality"] ||
                components["administrative_area_level_3"] ||
                components["administrative_area_level_2"] ||
                "",
            pincode: components["postal_code"] || "",
            state: components["administrative_area_level_1"] || "",
            country: components["country"] || "",
            formattedAddress: firstResult.formatted_address,
        };

        return NextResponse.json(parsed);
    } catch {
        return NextResponse.json(
            { error: "Failed to fetch location data" },
            { status: 500 }
        );
    }
}
