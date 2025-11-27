// ML Service that connects to Python backend
const API_URL = "http://localhost:5000/api";

class MLServiceBackend {
  constructor() {
    this.backendAvailable = false;
    this.checkBackendHealth();
  }

  async checkBackendHealth() {
    try {
      const response = await fetch(`${API_URL}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        this.backendAvailable = true;
        const data = await response.json();
        console.log("✅ Python ML Backend Connected:", data);
        return true;
      }
    } catch (error) {
      console.warn(
        "⚠️ Python ML Backend not available. Using frontend simulation."
      );
      this.backendAvailable = false;
    }
    return false;
  }

  async uploadZoningDocument(file, city = "bangalore") {
    if (!this.backendAvailable) {
      return this._simulateUpload(file);
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("city", city);

    try {
      const response = await fetch(`${API_URL}/upload-document`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      return {
        id: data.document_id,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadDate: new Date().toISOString(),
        processed: data.processed,
        extractedRules: data.extracted_rules,
        city: data.city,
      };
    } catch (error) {
      console.error("Error uploading document:", error);
      throw error;
    }
  }

  async trainModel() {
    if (!this.backendAvailable) {
      return {
        success: true,
        accuracy: 0.85,
        model_version: "simulated",
        training_samples: 0,
      };
    }

    try {
      const response = await fetch(`${API_URL}/train-model`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Training failed");
      }

      return await response.json();
    } catch (error) {
      console.error("Error training model:", error);
      throw error;
    }
  }

  async extractZoningAttributes(polygon, nearbyAreas, city = "bangalore") {
    if (!this.backendAvailable) {
      return this._frontendExtraction(polygon, nearbyAreas);
    }

    try {
      const response = await fetch(`${API_URL}/predict-zoning`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ polygon, nearby_areas: nearbyAreas, city }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "NO_ZONING_DOCS") {
          throw new Error(data.error);
        }
        throw new Error("Prediction failed");
      }

      return data.zoning_attributes;
    } catch (error) {
      console.error("Error predicting zoning:", error);
      throw error;
    }
  }

  // Helper to fetch amenities from Overpass API
  async _fetchAmenitiesFromOverpass(lat, lng) {
    try {
      const radius = 5000; // 5km radius for better coverage
      const query = `
        [out:json][timeout:25];
        (
          node["amenity"="school"](around:${radius},${lat},${lng});
          way["amenity"="school"](around:${radius},${lat},${lng});
          
          node["amenity"="hospital"](around:${radius},${lat},${lng});
          way["amenity"="hospital"](around:${radius},${lat},${lng});
          
          node["railway"="subway_entrance"](around:${radius},${lat},${lng});
          node["station"="subway"](around:${radius},${lat},${lng});
          node["highway"="bus_stop"](around:${radius},${lat},${lng});
          
          node["leisure"="park"](around:${radius},${lat},${lng});
          way["leisure"="park"](around:${radius},${lat},${lng});
        );
        out body;
        >;
        out skel qt;
      `;

      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: query,
      });

      if (!response.ok) throw new Error("Overpass API failed");

      const data = await response.json();
      const elements = data.elements;

      const schools = [];
      const hospitals = [];
      const transport = [];
      const parks = [];

      elements.forEach((el) => {
        if (el.tags && el.lat && el.lon) {
          const name = el.tags.name || "Unnamed";
          const distance = parseFloat(
            this._calculateDistance(lat, lng, el.lat, el.lon).toFixed(2)
          );

          // Skip if distance is 0 or NaN
          if (!distance || distance === 0) return;

          // Walking: 5 km/h, Driving: 30 km/h
          const walkingTime = Math.max(1, Math.round((distance / 5) * 60));
          const drivingTime = Math.max(1, Math.round((distance / 30) * 60));

          if (el.tags.amenity === "school") {
            schools.push({ name, distance, walkingTime, drivingTime });
          } else if (el.tags.amenity === "hospital") {
            hospitals.push({ name, distance, walkingTime, drivingTime });
          } else if (
            el.tags.railway === "subway_entrance" ||
            el.tags.station === "subway" ||
            el.tags.highway === "bus_stop"
          ) {
            transport.push({
              name: el.tags.name || "Transit Stop",
              distance,
              walkingTime,
              drivingTime,
            });
          } else if (el.tags.leisure === "park") {
            parks.push({ name, distance, walkingTime, drivingTime });
          }
        }
      });

      // Sort by distance and take top 3, format properly
      const result = {
        schools: schools.sort((a, b) => a.distance - b.distance).slice(0, 3),
        hospitals: hospitals
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 3),
        transport: transport
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 3),
        parks: parks.sort((a, b) => a.distance - b.distance).slice(0, 3),
      };

      console.log("Overpass API Result:", result);

      // If no results, use fallback
      const totalResults =
        result.schools.length +
        result.hospitals.length +
        result.transport.length +
        result.parks.length;
      if (totalResults === 0) {
        console.warn("No amenities found from Overpass, using fallback data");
        return this._getFallbackAmenities();
      }

      return result;
    } catch (error) {
      console.error("Error fetching amenities from Overpass:", error);
      return this._getFallbackAmenities();
    }
  }

  _getFallbackAmenities() {
    return {
      schools: [
        {
          name: "Local School",
          distance: 1.2,
          walkingTime: 14,
          drivingTime: 2,
        },
        {
          name: "Public High School",
          distance: 2.8,
          walkingTime: 34,
          drivingTime: 6,
        },
        {
          name: "International School",
          distance: 4.5,
          walkingTime: 54,
          drivingTime: 9,
        },
      ],
      hospitals: [
        {
          name: "City Hospital",
          distance: 2.5,
          walkingTime: 30,
          drivingTime: 5,
        },
        {
          name: "Medical Center",
          distance: 3.2,
          walkingTime: 38,
          drivingTime: 6,
        },
        {
          name: "District Clinic",
          distance: 1.8,
          walkingTime: 22,
          drivingTime: 4,
        },
      ],
      transport: [
        { name: "Bus Stop", distance: 0.8, walkingTime: 10, drivingTime: 2 },
        {
          name: "Metro Station",
          distance: 1.5,
          walkingTime: 18,
          drivingTime: 3,
        },
        {
          name: "Railway Station",
          distance: 3.0,
          walkingTime: 36,
          drivingTime: 6,
        },
      ],
      parks: [
        { name: "Local Park", distance: 0.5, walkingTime: 6, drivingTime: 1 },
        {
          name: "Community Garden",
          distance: 1.2,
          walkingTime: 14,
          drivingTime: 2,
        },
        {
          name: "Recreation Area",
          distance: 2.0,
          walkingTime: 24,
          drivingTime: 4,
        },
      ],
    };
  }

  _calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat2 || !lon2) return 0;
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async generateReport(
    polygon,
    attributes,
    nearbyAreas,
    city = "bangalore",
    area = null
  ) {
    // Calculate centroid
    const centroid = polygon
      .reduce(
        (acc, coord) => {
          acc[0] += coord[0];
          acc[1] += coord[1];
          return acc;
        },
        [0, 0]
      )
      .map((v) => v / polygon.length);

    // Fetch real amenities
    const amenities = await this._fetchAmenitiesFromOverpass(
      centroid[1],
      centroid[0]
    );

    if (!this.backendAvailable) {
      return this._frontendReportGeneration(
        polygon,
        attributes,
        nearbyAreas,
        amenities
      );
    }

    try {
      console.log("Generating report for city:", city);
      console.log("Area (sqm):", area);

      // Create a timeout promise
      const timeout = new Promise(
        (_, reject) =>
          setTimeout(() => reject(new Error("Request timed out")), 60000) // 60 second timeout
      );

      // Create the fetch promise
      const fetchPromise = fetch(`${API_URL}/generate-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          polygon,
          nearby_areas: nearbyAreas,
          city: city,
          area: area, // Pass accurate area from turf.js
          amenities: amenities, // Pass frontend-fetched amenities to backend if needed
        }),
      });

      // Race them
      const response = await Promise.race([fetchPromise, timeout]);

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.code === "NO_ZONING_DOCS") {
          throw new Error(errorData.error); // Propagate this specific error
        }
        throw new Error("Backend request failed");
      }

      const data = await response.json();
      // Use backend amenities if available, otherwise use frontend-fetched ones
      return {
        ...data.report,
        amenities: data.report.amenities || amenities,
      };
    } catch (error) {
      console.error("Error generating report:", error);

      // If it's the specific zoning docs error, re-throw it so UI can handle it
      if (error.message.includes("No zoning regulations found")) {
        throw error;
      }

      // Otherwise fallback to frontend simulation
      console.log("Falling back to frontend simulation due to error");
      return this._frontendReportGeneration(
        polygon,
        attributes,
        nearbyAreas,
        amenities
      );
    }
  }

  async getDocuments(city = null) {
    // Try to fetch documents from backend even if health check previously failed.
    try {
      const url = new URL(`${API_URL}/documents`);
      if (city) url.searchParams.append("city", city);
      const response = await fetch(url.toString(), { cache: "no-store" });
      if (!response.ok) {
        console.warn("Backend /documents returned non-OK:", response.status);
        this.backendAvailable = false;
        return [];
      }
      const data = await response.json();
      this.backendAvailable = true;
      console.log("Fetched documents from backend:", data.documents.length);
      return data.documents;
    } catch (error) {
      console.warn("Error getting documents from backend:", error);
      this.backendAvailable = false;
      return [];
    }
  }

  async deleteDocument(docId) {
    if (!this.backendAvailable) return;

    try {
      await fetch(`${API_URL}/documents/${docId}`, { method: "DELETE" });
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  }

  // Frontend fallback methods
  _simulateUpload(file) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: Date.now(),
          name: file.name,
          size: file.size,
          type: file.type,
          uploadDate: new Date().toISOString(),
          processed: true,
          extractedRules: Math.floor(Math.random() * 10) + 5,
          city: "bangalore",
        });
      }, 1000);
    });
  }

  _frontendExtraction(polygon, nearbyAreas) {
    const typeCounts = {};
    nearbyAreas.forEach((area) => {
      typeCounts[area.type] = (typeCounts[area.type] || 0) + 1;
    });

    const dominantType = Object.keys(typeCounts).reduce(
      (a, b) => (typeCounts[a] > typeCounts[b] ? a : b),
      "residential"
    );

    const attributesMap = {
      residential: {
        zoneType: "residential",
        far: "1.5 - 2.5",
        maxHeight: "15m - 45m",
        groundCoverage: "40% - 60%",
        setback: "3m - 6m",
        parking: "1 per 100 sqm",
        landUse: ["Apartments", "Villas", "Gated Communities", "Row Houses"],
        restrictions: [
          "No commercial activities",
          "Noise compliance",
          "Green space requirements",
        ],
      },
      commercial: {
        zoneType: "commercial",
        far: "2.5 - 3.5",
        maxHeight: "45m - 60m",
        groundCoverage: "50% - 70%",
        setback: "6m - 9m",
        parking: "1 per 50 sqm",
        landUse: [
          "Office Buildings",
          "Shopping Malls",
          "Retail Stores",
          "Business Parks",
        ],
        restrictions: [
          "Fire safety compliance",
          "Parking requirements",
          "Signage regulations",
        ],
      },
      industrial: {
        zoneType: "industrial",
        far: "1.5 - 2.0",
        maxHeight: "15m - 30m",
        groundCoverage: "60% - 75%",
        setback: "9m - 12m",
        parking: "1 per 75 sqm",
        landUse: [
          "Factories",
          "Warehouses",
          "Manufacturing Units",
          "Storage Facilities",
        ],
        restrictions: [
          "Environmental clearance",
          "No hazardous materials",
          "Pollution control",
        ],
      },
      mixed: {
        zoneType: "mixed",
        far: "2.0 - 3.0",
        maxHeight: "30m - 50m",
        groundCoverage: "50% - 65%",
        setback: "4.5m - 7.5m",
        parking: "1 per 65 sqm",
        landUse: [
          "Mixed-use Towers",
          "Live-Work Spaces",
          "Retail + Apartments",
          "Office + Residential",
        ],
        restrictions: [
          "Mixed-use compliance",
          "Separate entrances",
          "Noise mitigation",
        ],
      },
    };

    return attributesMap[dominantType] || attributesMap.residential;
  }

  async _frontendReportGeneration(polygon, attributes, nearbyAreas, amenities) {
    // Simulate a delay
    return new Promise((resolve) => {
      setTimeout(() => {
        const area = Math.round(
          (Math.abs(
            polygon.reduce((acc, p, i) => {
              const next = polygon[(i + 1) % polygon.length];
              return acc + (p[0] * next[1] - next[0] * p[1]);
            }, 0)
          ) *
            111320 *
            111320) /
            2
        );

        resolve({
          parcelInfo: {
            area: area,
            perimeter: Math.round(Math.sqrt(area) * 4),
            centroid: [0, 0], // Simplified
          },
          zoningDetails: attributes,
          amenities: amenities || {
            schools: [
              {
                name: "Greenwood High",
                distance: "1.2",
                time: "4 min",
                rating: "4.5",
              },
              {
                name: "Delhi Public School",
                distance: "2.5",
                time: "8 min",
                rating: "4.2",
              },
            ],
            hospitals: [
              {
                name: "Apollo Hospital",
                distance: "3.0",
                time: "10 min",
                rating: "4.8",
              },
              {
                name: "Manipal Hospital",
                distance: "4.5",
                time: "15 min",
                rating: "4.6",
              },
            ],
            metro: [
              {
                name: "Indiranagar Metro",
                distance: "1.5",
                time: "5 min",
                line: "Purple Line",
              },
            ],
          },
          floodRisk: {
            current: {
              riskScore: 15,
              riskLevel: "Low",
              description: "Minimal flood risk",
              depthInches: 0.5,
              elevation: 10,
            },
            future: [
              {
                year: "+5 Years",
                riskScore: 18,
                riskLevel: "Low",
                depthInches: 0.8,
              },
              {
                year: "+10 Years",
                riskScore: 25,
                riskLevel: "Moderate",
                depthInches: 2.5,
              },
              {
                year: "+20 Years",
                riskScore: 35,
                riskLevel: "Moderate",
                depthInches: 4.2,
              },
            ],
          },
          buildability: {
            score: 85,
            grade: "A",
            breakdown: {
              zoning: 90,
              shape: 85,
              infrastructure: 80,
            },
            factors: [
              { name: "Zoning Compliance", score: 22, status: "Excellent" },
              { name: "Plot Geometry", score: 21, status: "Good" },
              { name: "Road Access", score: 20, status: "Good" },
              { name: "Utility Availability", score: 22, status: "Excellent" },
            ],
          },
          pricing: {
            estimatedValue: {
              low: area * 8000,
              high: area * 12000,
              average: area * 10000,
            },
            pricePerSqft: {
              low: 8000,
              high: 12000,
              average: 10000,
              min: 8000,
              max: 12000,
            },
            marketTrend: {
              trend: "Upward",
              growthRate: "+5.2%",
            },
          },
          scenarios: [
            {
              name: "Residential Tower",
              roi: "18%",
              description:
                "High-rise residential complex with premium amenities.",
              builtArea: area * 2.5,
              floors: 12,
            },
            {
              name: "Mixed-Use Complex",
              roi: "22%",
              description: "Retail on ground floors with office spaces above.",
              builtArea: area * 3.0,
              floors: 15,
            },
          ],
          mlConfidence: 0.92,
          recommendations: [
            {
              type: "positive",
              title: "High Growth Potential",
              description:
                "Located in a rapidly developing zone with planned infrastructure upgrades.",
            },
            {
              type: "warning",
              title: "Setback Requirements",
              description:
                "Ensure strict adherence to setback rules due to road width.",
            },
          ],
          aqiForecast: [
            45, 48, 50, 52, 49, 47, 45, 44, 46, 48, 50, 55, 58, 60, 55, 50, 48,
            45, 42, 40, 38, 40, 42, 45, 48, 50, 52, 55, 58, 60,
          ],
          lightningRisk: {
            riskLevel: "Low",
            warning: "Standard lightning protection measures are recommended.",
          },
        });
      }, 2000);
    });
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default new MLServiceBackend();
