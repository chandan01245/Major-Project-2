import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import * as turf from "@turf/turf";
import {
  AlertCircle,
  Building,
  Building2,
  Factory,
  FileText,
  Globe,
  Home,
  Info,
  Layers,
  Loader2,
  MapPin,
  Menu,
  Pencil,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReportPreview from "./components/ReportPreview";
import { cities } from "./config/cities";
import sampleBuildings from "./data/sample_buildings.geojson";
import building3DService from "./services/building3DService";
import mapService from "./services/mapService";
import mlService from "./services/mlServiceBackend";
import pdfService from "./services/pdfService";
import trafficService from "./services/trafficService";

const IndianUrbanForm = () => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedCity, setSelectedCity] = useState(null); // Start with null for World View
  const [activeZone, setActiveZone] = useState("all");
  const [selectedArea, setSelectedArea] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawnPolygon, setDrawnPolygon] = useState(null);
  const [generatedReport, setGeneratedReport] = useState(null);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [showDocumentPanel, setShowDocumentPanel] = useState(false);
  const [mapStyle, setMapStyle] = useState("streets");
  const [isChangingStyle, setIsChangingStyle] = useState(false);
  const [currentDrawingArea, setCurrentDrawingArea] = useState(0);
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [cityZones, setCityZones] = useState([]);
  const [showZoneOverlays, setShowZoneOverlays] = useState(false);
  const [showZoningModal, setShowZoningModal] = useState(false);
  const [isUploadingDocuments, setIsUploadingDocuments] = useState(false);
  const [isLoading3D, setIsLoading3D] = useState(false);
  const [show3DView, setShow3DView] = useState(false);
  const [isLoadingZones, setIsLoadingZones] = useState(false);
  const [buildingModels, setBuildingModels] = useState([]);
  const [placedBuildings, setPlacedBuildings] = useState([]);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const cityMarkersRef = useRef([]);
  const drawRef = useRef(null);
  const fileInputRef = useRef(null);
  const drawControlAddedRef = useRef(false);
  const zoneClickHandlerRef = useRef(false);

  const zoningRegulations = {
    residential: {
      color: "#4CAF50",
      name: "Residential",
      icon: Home,
      far: "1.5 - 2.5",
      maxHeight: "15m - 45m",
      groundCoverage: "40% - 60%",
      setback: "3m - 6m",
      parking: "1 per 100 sqm",
      description: "Residential buildings, apartments, housing complexes",
      examples: ["Apartments", "Villas", "Gated Communities", "Row Houses"],
    },
    commercial: {
      color: "#2196F3",
      name: "Commercial",
      icon: Building,
      far: "2.5 - 3.5",
      maxHeight: "45m - 60m",
      groundCoverage: "50% - 70%",
      setback: "6m - 9m",
      parking: "1 per 50 sqm",
      description: "Offices, retail, shopping centers, business parks",
      examples: [
        "Office Buildings",
        "Shopping Malls",
        "Retail Stores",
        "Business Parks",
      ],
    },
    industrial: {
      color: "#FF9800",
      name: "Industrial",
      icon: Factory,
      far: "1.5 - 2.0",
      maxHeight: "15m - 30m",
      groundCoverage: "60% - 75%",
      setback: "9m - 12m",
      parking: "1 per 75 sqm",
      description: "Manufacturing, warehouses, industrial units",
      examples: [
        "Factories",
        "Warehouses",
        "Manufacturing Units",
        "Storage Facilities",
      ],
    },
    mixed: {
      color: "#9C27B0",
      name: "Mixed Use",
      icon: Building2,
      far: "2.0 - 3.0",
      maxHeight: "30m - 50m",
      groundCoverage: "50% - 65%",
      setback: "4.5m - 7.5m",
      parking: "1 per 65 sqm",
      description: "Combination of residential, commercial, and retail",
      examples: [
        "Mixed-use Towers",
        "Live-Work Spaces",
        "Retail + Apartments",
        "Commercial + Residential",
      ],
    },
  };

  useEffect(() => {
    initializeMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      drawControlAddedRef.current = false;
      drawRef.current = null;
    };
  }, []);

  // Handle City Selection Changes
  useEffect(() => {
    if (selectedCity) {
      loadCityData(selectedCity);
      setSidebarOpen(true);
    } else {
      // Reset to world view if needed, or just clear data
      setCityZones([]);
      if (mapRef.current) {
        mapRef.current.flyTo({ center: [0, 20], zoom: 2 });
        renderCityMarkers();
      }
    }
  }, [selectedCity]);

  const loadCityData = async (city) => {
    setIsLoadingZones(true);
    setCityZones([]);

    // Fly to city
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [city.lng, city.lat],
        zoom: city.zoom,
        duration: 2000,
      });
      // Remove city markers when inside a city
      cityMarkersRef.current.forEach((marker) => marker.remove());
      cityMarkersRef.current = [];
    }

    // Fetch Documents
    fetchExistingDocuments(city.id);

    // Fetch Zones
    try {
      const zones = await mapService.fetchCityZones(city.id, city.name, {
        lat: city.lat,
        lng: city.lng,
      });
      setCityZones(zones);
    } catch (error) {
      console.error("Error fetching city zones:", error);
      setCityZones([]);
    } finally {
      setIsLoadingZones(false);
    }
  };

  // Update map markers/polygons when zones change or toggle changes
  useEffect(() => {
    if (mapLoaded && selectedCity && cityZones.length > 0) {
      updateMapVisualization();
    }
  }, [cityZones, showZoneOverlays, mapLoaded, selectedCity]);

  const fetchExistingDocuments = async (cityId) => {
    try {
      const docs = await mlService.getDocuments();
      console.log("All documents:", docs);
      console.log("City ID:", cityId);

      // Filter documents for this city (case-insensitive)
      const cityDocs = docs.filter((d) => {
        if (!d.city) return false;
        return d.city.toLowerCase() === cityId.toLowerCase();
      });

      console.log("Filtered city docs:", cityDocs);
      setUploadedDocuments(cityDocs);

      // Check if no documents exist for this city
      if (cityDocs.length === 0) {
        // We can show a toast or just rely on the modal that pops up when drawing
        // But user asked to "check if there is a zoning document... and also add the rest of the major cities"
        // The modal logic is already in toggleDrawMode, but we can also show a subtle alert here if needed.
        // For now, we'll rely on the modal when they try to act, but we could auto-show the modal if we wanted to be aggressive.
        // Let's just ensure the state is correct.
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
  };

  // Search Effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 2) {
        if (selectedCity) {
          // Search within city context if possible, or global
          const results = await mapService.searchLocation(
            searchQuery,
            selectedCity
          );
          setSearchResults(results);
        } else {
          // Global search (not implemented in mapService yet, but fallback to generic)
          const results = await mapService.searchLocation(searchQuery);
          setSearchResults(results);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, selectedCity]);

  const initializeMap = () => {
    if (mapRef.current || !mapContainerRef.current) return;

    try {
      maptilersdk.config.apiKey = process.env.REACT_APP_MAPTILER_KEY;

      const map = new maptilersdk.Map({
        container: mapContainerRef.current,
        style: maptilersdk.MapStyle.STREETS,
        center: [0, 20], // World view
        zoom: 2,
        pitch: 0,
        bearing: 0,
        attributionControl: false,
        terrain: false, // Disable terrain to avoid shader errors
        terrainControl: false,
        fadeDuration: 0, // Disable fade animation to prevent sprite loading issues
        crossSourceCollisions: false, // Prevent collision detection issues
      });

      mapRef.current = map;
      map.addControl(new maptilersdk.AttributionControl(), "bottom-right");

      // Initialize drawing tools
      if (!drawRef.current) {
        const draw = new MapboxDraw({
          displayControlsDefault: false,
          controls: {
            polygon: true,
            trash: true,
          },
          defaultMode: "simple_select",
          styles: [
            {
              id: "gl-draw-polygon-fill-inactive",
              type: "fill",
              filter: [
                "all",
                ["==", "active", "false"],
                ["==", "$type", "Polygon"],
                ["!=", "mode", "static"],
              ],
              paint: {
                "fill-color": "#3bb2d0",
                "fill-outline-color": "#3bb2d0",
                "fill-opacity": 0.1,
              },
            },
            {
              id: "gl-draw-polygon-stroke-inactive",
              type: "line",
              filter: [
                "all",
                ["==", "active", "false"],
                ["==", "$type", "Polygon"],
                ["!=", "mode", "static"],
              ],
              layout: {
                "line-cap": "round",
                "line-join": "round",
              },
              paint: {
                "line-color": "#3bb2d0",
                "line-width": 2,
              },
            },
            // Active (drawing) styles - Enhanced visibility
            {
              id: "gl-draw-polygon-fill-active",
              type: "fill",
              filter: [
                "all",
                ["==", "active", "true"],
                ["==", "$type", "Polygon"],
              ],
              paint: {
                "fill-color": "#fbb03b",
                "fill-outline-color": "#fbb03b",
                "fill-opacity": 0.2,
              },
            },
            {
              id: "gl-draw-polygon-stroke-active",
              type: "line",
              filter: [
                "all",
                ["==", "active", "true"],
                ["==", "$type", "Polygon"],
              ],
              layout: {
                "line-cap": "round",
                "line-join": "round",
              },
              paint: {
                "line-color": "#fbb03b",
                "line-dasharray": [0.2, 2],
                "line-width": 2,
              },
            },
            {
              id: "gl-draw-polygon-and-line-vertex-active",
              type: "circle",
              filter: [
                "all",
                ["==", "meta", "vertex"],
                ["==", "$type", "Point"],
                ["!=", "mode", "static"],
              ],
              paint: {
                "circle-radius": 6,
                "circle-color": "#fbb03b",
              },
            },
          ],
        });

        drawRef.current = draw;

        map.on("draw.create", handleDrawCreate);
        map.on("draw.delete", handleDrawDelete);
        map.on("draw.update", handleDrawUpdate);
        map.on("draw.modechange", (e) => {
          if (e.mode === "draw_polygon") {
            map.getCanvas().style.cursor = "crosshair";
          } else {
            map.getCanvas().style.cursor = "";
          }
        });
      }

      map.on("load", () => {
        setMapLoaded(true);
        if (drawRef.current && !drawControlAddedRef.current) {
          map.addControl(drawRef.current, "bottom-right");
          drawControlAddedRef.current = true;
        }

        // Enable 3D buildings from OSM data
        add3DBuildingsLayer();

        renderCityMarkers();
      });

      // Listen to zoom changes to show/hide city markers
      map.on("zoom", () => {
        const zoom = map.getZoom();
        const shouldShowCityMarkers = zoom < 6; // Show markers when zoomed out

        if (
          shouldShowCityMarkers &&
          !selectedCity &&
          cityMarkersRef.current.length === 0
        ) {
          renderCityMarkers();
        } else if (!shouldShowCityMarkers && selectedCity === null) {
          // Keep markers visible in world view even when zoomed in a bit
        }
      });

      // Listen to move end to detect when user zooms out to world view
      map.on("moveend", () => {
        const zoom = map.getZoom();
        if (
          zoom < 6 &&
          selectedCity !== null &&
          cityMarkersRef.current.length === 0
        ) {
          // User zoomed out, show city markers and reset to world view
          setSelectedCity(null);
          renderCityMarkers();
        }
      });
    } catch (error) {
      console.error("Error initializing map:", error);
    }
  };

  const updateMapVisualization = () => {
    if (!mapRef.current || !mapRef.current.isStyleLoaded()) return;

    // Safety check for draw control
    if (!drawRef.current) {
      console.warn("Draw control not initialized yet");
      return;
    }

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Prepare polygon features
    const features = showZoneOverlays ? cityZones
      .filter((zone) => zone.isPolygon)
      .map((zone) => ({
        type: "Feature",
        geometry: zone.geometry,
        properties: {
          color: zone.color,
          name: zone.name,
          type: zone.type,
        },
      })) : [];

    // Update or create zones source and layers
    if (showZoneOverlays && features.length > 0) {
      const zonesSource = mapRef.current.getSource("zones");
      
      if (zonesSource) {
        // Update existing source instead of removing and re-adding
        zonesSource.setData({
          type: "FeatureCollection",
          features: features,
        });
      } else {
        // Create new source and layers
        mapRef.current.addSource("zones", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: features,
          },
        });

        mapRef.current.addLayer({
          id: "zones-fill",
          type: "fill",
          source: "zones",
          paint: {
            "fill-color": ["get", "color"],
            "fill-opacity": 0.4,
          },
        });

        mapRef.current.addLayer({
          id: "zones-outline",
          type: "line",
          source: "zones",
          paint: {
            "line-color": ["get", "color"],
            "line-width": 2,
          },
        });
      }
    } else {
      // Remove layers if showZoneOverlays is false
      if (mapRef.current.getLayer("zones-fill"))
        mapRef.current.removeLayer("zones-fill");
      if (mapRef.current.getLayer("zones-outline"))
        mapRef.current.removeLayer("zones-outline");
      if (mapRef.current.getSource("zones"))
        mapRef.current.removeSource("zones");
    }

    // Remove procedural 3D layers if they exist
    ["procedural-buildings-extrude", "procedural-trees-extrude", "procedural-trees-extrude-trunk"].forEach((layer) => {
      if (mapRef.current.getLayer(layer)) mapRef.current.removeLayer(layer);
    });
    ["procedural-buildings", "procedural-trees"].forEach((source) => {
      if (mapRef.current.getSource(source)) mapRef.current.removeSource(source);
    });

      // Add 3D Extrusion for Drawn Polygon if available
      if (drawnPolygon && generatedReport) {
        // Ensure source exists for drawn polygon if not already handled by Draw control
        // Actually, MapboxDraw handles the 2D display. For 3D, we need a separate layer.

        const extrusionSourceId = "drawn-polygon-extrusion";
        const extrusionLayerId = "drawn-polygon-3d";

        if (mapRef.current.getSource(extrusionSourceId)) {
          mapRef.current.removeLayer(extrusionLayerId);
          mapRef.current.removeSource(extrusionSourceId);
        }

        mapRef.current.addSource(extrusionSourceId, {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [drawnPolygon],
            },
          },
        });

        // Determine height based on FAR or default
        // generatedReport.zoningDetails.maxHeight is a string like "15m - 45m"
        // We'll parse it or use a default
        let height = 20; // default meters
        if (generatedReport.zoningDetails?.maxHeight) {
          const match = generatedReport.zoningDetails.maxHeight.match(/(\d+)/);
          if (match) height = parseInt(match[0], 10);
        }

        mapRef.current.addLayer({
          id: extrusionLayerId,
          type: "fill-extrusion",
          source: extrusionSourceId,
          paint: {
            "fill-extrusion-color": "#fbb03b",
            "fill-extrusion-height": height,
            "fill-extrusion-opacity": 0.8,
          },
        });

        // Also compute and show buildings that intersect this parcel (demo using sampleBuildings)
        try {
          const parcel = turf.polygon([drawnPolygon]);
          const inside = (sampleBuildings.features || []).filter((f) => {
            try {
              return turf.booleanIntersects(f, parcel);
            } catch (e) {
              return false;
            }
          });

          const buildingsSourceId = "buildings-in-polygon";
          const buildingsLayerId = "buildings-in-polygon-extrude";

          if (mapRef.current.getSource(buildingsSourceId)) {
            if (mapRef.current.getLayer(buildingsLayerId))
              mapRef.current.removeLayer(buildingsLayerId);
            mapRef.current.removeSource(buildingsSourceId);
          }

          mapRef.current.addSource(buildingsSourceId, {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: inside,
            },
          });

          mapRef.current.addLayer({
            id: buildingsLayerId,
            type: "fill-extrusion",
            source: buildingsSourceId,
            paint: {
              "fill-extrusion-color": "#6699FF",
              "fill-extrusion-height": [
                "coalesce",
                ["get", "height"],
                ["*", ["to-number", ["get", "building:levels"]], 3],
                8,
              ],
              "fill-extrusion-opacity": 0.95,
            },
          });
        } catch (e) {
          console.warn("Error computing buildings inside parcel:", e);
        }
      }

      // Add click interaction for polygons
      mapRef.current.on("click", "zones-fill", (e) => {
        const props = e.features[0].properties;
        // Find full zone object
        const zone = cityZones.find((z) => z.name === props.name);
        if (zone) handleAreaClick(zone);
      });

      // Cursor pointer
      mapRef.current.on("mouseenter", "zones-fill", () => {
        mapRef.current.getCanvas().style.cursor = "pointer";
      });
      mapRef.current.on("mouseleave", "zones-fill", () => {
        mapRef.current.getCanvas().style.cursor = "";
      })
    }
  };

  const renderCityMarkers = () => {
    cityMarkersRef.current.forEach((marker) => marker.remove());
    cityMarkersRef.current = [];

    // If a city is selected, do not show world view markers
    if (selectedCity) return;

    Object.values(cities).forEach((city) => {
      const el = document.createElement("div");
      el.className = "city-marker-container";
      el.style.display = "flex";
      el.style.flexDirection = "column";
      el.style.alignItems = "center";
      el.style.cursor = "pointer";

      const markerEl = document.createElement("div");
      markerEl.className = "city-marker";
      markerEl.style.backgroundColor = city.color || "#059669";
      markerEl.style.width = "16px";
      markerEl.style.height = "16px";
      markerEl.style.borderRadius = "50%";
      markerEl.style.border = "3px solid white";
      markerEl.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";

      const labelEl = document.createElement("div");
      labelEl.className = "city-label";
      labelEl.innerText = city.name;
      labelEl.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
      labelEl.style.padding = "2px 6px";
      labelEl.style.borderRadius = "4px";
      labelEl.style.fontSize = "12px";
      labelEl.style.fontWeight = "bold";
      labelEl.style.marginTop = "4px";
      labelEl.style.boxShadow = "0 1px 2px rgba(0,0,0,0.2)";
      labelEl.style.whiteSpace = "nowrap";

      el.appendChild(markerEl);
      el.appendChild(labelEl);

      const marker = new maptilersdk.Marker({ element: el })
        .setLngLat([city.lng, city.lat])
        .addTo(mapRef.current);

      marker.getElement().addEventListener("click", () => {
        setSelectedCity(city);
      });

      cityMarkersRef.current.push(marker);
    });
  };

  const handleAreaClick = (area) => {
    const regulation =
      zoningRegulations[area.type] || zoningRegulations.residential;
    setSelectedArea({
      ...area,
      regulations: regulation,
    });
  };

  const calculatePolygonArea = (coordinates) => {
    // Use turf.js for accurate geodesic area calculation
    try {
      const polygon = turf.polygon([coordinates]);
      const areaInSquareMeters = turf.area(polygon);
      return Math.round(areaInSquareMeters);
    } catch (error) {
      console.error("Error calculating area:", error);
      // Fallback to simple calculation
      let area = 0;
      const n = coordinates.length;
      for (let i = 0; i < n - 1; i++) {
        const [x1, y1] = coordinates[i];
        const [x2, y2] = coordinates[i + 1];
        area += x1 * y2 - x2 * y1;
      }
      area = Math.abs(area / 2);
      const metersPerDegree = 111320;
      return Math.round(area * metersPerDegree * metersPerDegree);
    }
  };

  const handleDrawCreate = async (e) => {
    const feature = e.features[0];
    if (feature.geometry.type === "Polygon") {
      setIsLoading3D(true);
      const coordinates = feature.geometry.coordinates[0].map((coord) => [
        coord[0],
        coord[1],
      ]);
      setDrawnPolygon(coordinates);
      setIsDrawingMode(false);

      // Calculate and set the area properly
      const area = calculatePolygonArea(coordinates);
      setCurrentDrawingArea(area);
      setDrawingPoints(coordinates.length - 1);

      // Reset cursor
      if (mapRef.current) mapRef.current.getCanvas().style.cursor = "";

      // Check if Park
      const isPark = await mapService.checkIfPark(coordinates);
      if (isPark) {
        alert(
          "⚠️ Warning: The selected area overlaps with a designated Park or Green Zone. Development may be restricted."
        );
      }

      // The building3DService handles loading models and placement internally
      // Just call it to place buildings in the parcel

      // Auto-tilt map for 3D view first
      if (mapRef.current) {
        // Zoom to parcel first
        const bounds = coordinates.reduce(
          (acc, coord) => {
            return [
              [Math.min(acc[0][0], coord[0]), Math.min(acc[0][1], coord[1])],
              [Math.max(acc[1][0], coord[0]), Math.max(acc[1][1], coord[1])],
            ];
          },
          [
            [Infinity, Infinity],
            [-Infinity, -Infinity],
          ]
        );

        mapRef.current.fitBounds(bounds, {
          padding: { top: 100, bottom: 100, left: 100, right: 100 },
          duration: 1000,
        });

        // Then tilt for 3D view
        setTimeout(() => {
          mapRef.current.easeTo({
            pitch: 60,
            bearing: -17.6,
            duration: 2000,
          });

          // Wait for animation and 3D tiles to load
          setTimeout(() => {
            setShow3DView(true);
            setIsLoading3D(false);
          }, 2500);
        }, 1200);
      } else {
        setShow3DView(true);
        setIsLoading3D(false);
      }

      // Generate Procedural 3D Assets with zoning parameters
      // Determine zoning type from nearby areas
      const centroid = coordinates
        .reduce(
          (acc, coord) => {
            acc[0] += coord[0];
            acc[1] += coord[1];
            return acc;
          },
          [0, 0]
        )
        .map((v) => v / coordinates.length);

      const nearestZone = cityZones
        .map((zone) => ({
          ...zone,
          distance: Math.sqrt(
            Math.pow(zone.lng - centroid[0], 2) +
              Math.pow(zone.lat - centroid[1], 2)
          ),
        }))
        .sort((a, b) => a.distance - b.distance)[0];

      // Define zoning parameters based on zone type
      const zoningParams = {
        residential: {
          maxHeight: 35,
          minHeight: 12,
          groundCoverage: 0.4,
          color: "#93c5fd",
        },
        commercial: {
          maxHeight: 55,
          minHeight: 20,
          groundCoverage: 0.6,
          color: "#fbbf24",
        },
        industrial: {
          maxHeight: 25,
          minHeight: 10,
          groundCoverage: 0.7,
          color: "#f97316",
        },
        mixed: {
          maxHeight: 45,
          minHeight: 15,
          groundCoverage: 0.5,
          color: "#a78bfa",
        },
      };

      const zoneType = nearestZone?.type || "residential";
      const params = zoningParams[zoneType] || zoningParams.residential;

      console.log(`🏙️ Using ${zoneType} zoning parameters:`, params);
      console.log(`📍 Parcel coordinates:`, coordinates);

      await building3DService.addBuildingsToParcel(
        mapRef.current,
        coordinates,
        zoneType,
        params
      );
    }
  };

  const handleDrawDelete = () => {
    setDrawnPolygon(null);
    setGeneratedReport(null);
    setCurrentDrawingArea(0);
    setDrawingPoints([]);
    setShow3DView(false);
    building3DService.removeAllBuildings(mapRef.current);
    setIsLoading3D(false);

    // Reset map view
    if (mapRef.current) {
      mapRef.current.easeTo({
        pitch: 0,
        bearing: 0,
        duration: 1000,
      });
    }
  };

  const handleDrawUpdate = (e) => {
    const feature = e.features[0];
    if (feature.geometry.type === "Polygon") {
      const coordinates = feature.geometry.coordinates[0].map((coord) => [
        coord[0],
        coord[1],
      ]);
      setDrawnPolygon(coordinates);
      if (coordinates.length >= 3) {
        const area = calculatePolygonArea(coordinates);
        setCurrentDrawingArea(area);
        setDrawingPoints(coordinates.length - 1);
      }
    }
  };

  const toggleDrawMode = () => {
    if (!drawRef.current) return;

    if (!selectedCity) {
      alert("Please select a city first.");
      return;
    }

    if (uploadedDocuments.length === 0) {
      setShowZoningModal(true);
      return;
    }

    if (isDrawingMode) {
      drawRef.current.changeMode("simple_select");
      setIsDrawingMode(false);
      mapRef.current.getCanvas().style.cursor = "";
    } else {
      drawRef.current.changeMode("draw_polygon");
      setIsDrawingMode(true);
      mapRef.current.getCanvas().style.cursor = "crosshair";
    }
  };

  const handleGenerateReport = async () => {
    if (!drawnPolygon) return;

    setIsGeneratingReport(true);
    await generateReportForPolygon(drawnPolygon);
  };

  const generateReportForPolygon = async (polygon) => {
    try {
      // Find nearby areas from our fetched zones
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

      const nearbyAreas = cityZones
        .map((area) => ({
          ...area,
          distance: Math.sqrt(
            Math.pow(area.lng - centroid[0], 2) +
              Math.pow(area.lat - centroid[1], 2)
          ),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5);

      const cityId = selectedCity?.id || "bangalore";
      const attributes = await mlService.extractZoningAttributes(
        polygon,
        nearbyAreas,
        cityId
      );
      const report = await mlService.generateReport(
        polygon,
        attributes,
        nearbyAreas,
        cityId
      );

      // Calculate Traffic Impact
      const areaSqM = currentDrawingArea;
      const trafficStats = trafficService.calculateTripGeneration(
        areaSqM,
        attributes.zoneType
      );
      const congestionImpact = trafficService.estimateCongestionImpact(
        trafficStats.peakHourTrips
      );

      // Attach to report
      report.traffic = {
        ...trafficStats,
        congestion: congestionImpact,
      };

      setGeneratedReport(report);
      setShowReportPreview(true);
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Error generating report. Please try again.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleCloseReport = () => {
    setShowReportPreview(false);
    setGeneratedReport(null);
    setShow3DView(false);
    // Reset drawing
    if (drawRef.current) {
      drawRef.current.deleteAll();
      handleDrawDelete();
    }
    // Reset cursor just in case
    if (mapRef.current) mapRef.current.getCanvas().style.cursor = "";
  };

  const handleDownloadReport = () => {
    if (generatedReport) {
      pdfService.generateReport(generatedReport);
    }
  };

  const handleDocumentUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploadingDocuments(true);

    for (const file of files) {
      try {
        const doc = await mlService.uploadZoningDocument(file, selectedCity.id);
        setUploadedDocuments((prev) => [...prev, doc]);
      } catch (error) {
        console.error("Error uploading document:", error);
        alert("Error uploading " + file.name);
      }
    }

    await fetchExistingDocuments(selectedCity.id);
    setIsUploadingDocuments(false);
    setShowZoningModal(false);
  };

  const handleDeleteDocument = (docId) => {
    mlService.deleteDocument(docId);
    setUploadedDocuments((prev) => prev.filter((doc) => doc.id !== docId));
  };

  const add3DBuildingsLayer = () => {
    if (!mapRef.current) return;

    try {
      // Remove existing 3D buildings layer if present
      if (mapRef.current.getLayer("3d-buildings")) {
        mapRef.current.removeLayer("3d-buildings");
      }

      const layers = mapRef.current.getStyle().layers;
      let firstSymbolId;
      for (const layer of layers) {
        if (layer.type === "symbol") {
          firstSymbolId = layer.id;
          break;
        }
      }

      mapRef.current.addLayer(
        {
          id: "3d-buildings",
          source: "openmaptiles",
          "source-layer": "building",
          type: "fill-extrusion",
          minzoom: 14,
          paint: {
            "fill-extrusion-color": [
              "case",
              ["has", "colour"],
              ["get", "colour"],
              "#aaa",
            ],
            "fill-extrusion-height": [
              "interpolate",
              ["linear"],
              ["zoom"],
              15,
              0,
              15.05,
              ["coalesce", ["get", "render_height"], 0],
            ],
            "fill-extrusion-base": [
              "interpolate",
              ["linear"],
              ["zoom"],
              15,
              0,
              15.05,
              ["coalesce", ["get", "render_min_height"], 0],
            ],
            "fill-extrusion-opacity": 0.8,
          },
        },
        firstSymbolId
      );

      console.log("✅ 3D buildings layer added");
    } catch (e) {
      console.warn("Could not add 3D buildings layer:", e);
    }
  };

  const changeMapStyle = (style) => {
    if (!mapRef.current) return;

    // Prevent style changes while already changing or map is still loading
    if (isChangingStyle) {
      console.warn("Style change already in progress, please wait...");
      return;
    }

    if (!mapRef.current.isStyleLoaded()) {
      console.warn("Map style still loading, please wait...");
      return;
    }

    setIsChangingStyle(true);
    console.log("🗺️ Changing map style to:", style);

    try {
      const styles = {
        streets: maptilersdk.MapStyle.STREETS,
        satellite: maptilersdk.MapStyle.SATELLITE,
        outdoor: maptilersdk.MapStyle.OUTDOOR,
        hybrid: maptilersdk.MapStyle.HYBRID,
        dataviz: maptilersdk.MapStyle.DATAVIZ,
      };

      // Save current map state
      const currentCenter = mapRef.current.getCenter();
      const currentZoom = mapRef.current.getZoom();
      const currentPitch = mapRef.current.getPitch();
      const currentBearing = mapRef.current.getBearing();

      // Remove existing controls
      if (drawRef.current && drawControlAddedRef.current) {
        try {
          mapRef.current.removeControl(drawRef.current);
          drawControlAddedRef.current = false;
        } catch (e) {
          console.warn("Error removing draw control:", e);
        }
      }

      const targetStyle = styles[style] || maptilersdk.MapStyle.STREETS;

      // Add error listener before changing style
      const onStyleError = (error) => {
        console.error("❌ Style load error:", error);
        setIsChangingStyle(false);
        // Try to recover to streets view
        if (style !== "streets") {
          setTimeout(() => {
            try {
              mapRef.current.setStyle(maptilersdk.MapStyle.STREETS, {
                diff: false,
              });
              setMapStyle("streets");
            } catch (e) {
              console.error("Recovery failed:", e);
            }
          }, 500);
        }
      };

      mapRef.current.once("error", onStyleError);

      // Set the new style with options to prevent shader/sprite errors
      mapRef.current.setStyle(targetStyle, {
        diff: false, // Use diff:false to avoid partial updates
        fadeDuration: 0, // Disable fade to prevent sprite loading issues
        crossSourceCollisions: false,
      });
      setMapStyle(style);

      // Wait for the style to fully load before resuming
      const onStyleLoad = () => {
        // Remove error listener since we loaded successfully
        mapRef.current.off("error", onStyleError);
        console.log("✅ Style loaded successfully");

        // Wait a bit longer to ensure all resources are ready
        setTimeout(() => {
          try {
            // Restore map state
            mapRef.current.jumpTo({
              center: currentCenter,
              zoom: currentZoom,
              pitch: currentPitch,
              bearing: currentBearing,
            });

            // Re-add 3D buildings after style change (with error handling)
            try {
              add3DBuildingsLayer();
            } catch (e) {
              console.warn("Could not add 3D buildings layer:", e);
            }

            if (selectedCity) {
              try {
                updateMapVisualization();
              } catch (e) {
                console.warn("Error updating visualization:", e);
              }
            } else {
              renderCityMarkers();
            }

            // Re-add draw controls
            if (drawRef.current && !drawControlAddedRef.current) {
              try {
                mapRef.current.addControl(drawRef.current, "bottom-right");
                drawControlAddedRef.current = true;
              } catch (e) {
                console.warn("Error adding draw control:", e);
              }
            }

            // Re-enable style changes
            setIsChangingStyle(false);
          } catch (e) {
            console.error("Error in style reload:", e);
            setIsChangingStyle(false);
          }
        }, 800);
      };

      // Listen for successful style load
      mapRef.current.once("style.load", onStyleLoad);
    } catch (error) {
      console.error("Error changing map style:", error);
      setIsChangingStyle(false);

      // Reset to streets on error
      if (mapRef.current && style !== "streets") {
        try {
          console.log("🔄 Attempting recovery to streets style...");
          mapRef.current.setStyle(maptilersdk.MapStyle.STREETS, {
            diff: false,
          });
          setMapStyle("streets");
          setTimeout(() => setIsChangingStyle(false), 1000);
        } catch (e) {
          console.error("Fatal map style error:", e);
          setIsChangingStyle(false);
        }
      }
    }
  };

  const flyToArea = (area) => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [area.lng, area.lat],
        zoom: 14,
        duration: 1500,
      });
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-96" : "w-0"
        } transition-all duration-300 bg-white border-r border-emerald-200 flex flex-col overflow-hidden`}
      >
        <div
          className={`min-w-[384px] flex flex-col h-full ${
            sidebarOpen ? "" : "hidden"
          }`}
        >
          {/* Header */}
          <div className="p-6 border-b border-emerald-200 bg-gradient-to-r from-emerald-500 to-green-500">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">
                    UrbanForm Pro
                  </h1>
                  <p className="text-xs text-emerald-100">
                    ML-Powered GIS Analysis
                  </p>
                </div>
              </div>
            </div>

            {/* City Selection */}
            <div className="mb-4">
              <label className="text-xs text-emerald-100 mb-1 block">
                Select City
              </label>
              <div className="relative">
                <select
                  value={selectedCity ? selectedCity.id : ""}
                  onChange={(e) => {
                    const city = cities[e.target.value];
                    if (city) setSelectedCity(city);
                  }}
                  className="w-full bg-white/10 border border-white/20 rounded-lg text-white p-2 text-sm focus:outline-none focus:bg-white/20 option:text-black"
                >
                  <option value="" className="text-slate-800">
                    Select a city...
                  </option>
                  {Object.values(cities).map((city) => (
                    <option
                      key={city.id}
                      value={city.id}
                      className="text-slate-800"
                    >
                      {city.name}, {city.country}
                    </option>
                  ))}
                </select>
                {!selectedCity && (
                  <div className="absolute right-2 top-2 text-white/50 text-xs pointer-events-none">
                    <Globe className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>

            {selectedCity && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search areas or places..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-emerald-100 focus:outline-none focus:bg-white/20 text-sm"
                />
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="mt-2 bg-white rounded-lg shadow-lg max-h-48 overflow-y-auto z-50 absolute w-[336px]">
                {searchResults.map((result, idx) => (
                  <button
                    key={idx}
                    onClick={() => flyToArea(result)}
                    className="w-full p-3 text-left hover:bg-emerald-50 border-b border-slate-100 last:border-b-0"
                  >
                    <p className="text-sm font-semibold text-slate-800">
                      {result.name}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedCity ? (
            <>
              {/* Document Upload Section */}
              <div className="p-4 border-b border-emerald-100 bg-emerald-50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-emerald-900">
                    Zoning Documents
                  </h3>
                  <button
                    onClick={() => setShowDocumentPanel(!showDocumentPanel)}
                    className="text-xs text-emerald-600 hover:text-emerald-700"
                  >
                    {showDocumentPanel ? "Hide" : "Show"}
                  </button>
                </div>

                {showDocumentPanel && (
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleDocumentUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2 px-3 bg-white border-2 border-dashed border-emerald-300 rounded-lg text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Documents
                    </button>

                    {uploadedDocuments.length > 0 ? (
                      <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                        {uploadedDocuments.map((doc) => (
                          <div
                            key={doc.id}
                            className={`bg-white p-3 rounded-lg border border-emerald-200 shadow-sm ${
                              doc.isBuffering ? "opacity-70" : ""
                            }`}
                          >
                            {doc.isBuffering && (
                              <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10 rounded-lg">
                                <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                              </div>
                            )}
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-2 flex-1 min-w-0">
                                <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-slate-800 truncate">
                                    {doc.filename || doc.name}
                                  </p>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {doc.rules_count !== undefined && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                                        📋 {doc.rules_count} rules
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="p-1 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 text-center mt-2">
                        No documents uploaded yet
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Zones List */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-emerald-900">
                      Districts
                    </h3>
                    <button
                      onClick={() => setShowZoneOverlays(!showZoneOverlays)}
                      className={`text-xs px-2 py-1 rounded border ${
                        showZoneOverlays
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-emerald-600 border-emerald-200"
                      }`}
                    >
                      {showZoneOverlays
                        ? "Show Markers"
                        : "Highlight Districts"}
                    </button>
                  </div>

                  {isLoadingZones ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                      <span className="ml-2 text-sm text-slate-500">
                        Loading zones...
                      </span>
                    </div>
                  ) : (
                    cityZones.map((area, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          handleAreaClick(area);
                        }}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50 transition-all text-left flex items-center gap-3"
                      >
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: area.color }}
                        />
                        <div>
                          <p className="font-semibold text-sm text-slate-800">
                            {area.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="capitalize">{area.type}</span>
                            <span>•</span>
                            <span>
                              {area.currency} {area.price?.toLocaleString()}
                              /sqft
                            </span>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {selectedArea && !generatedReport && (
                  <div className="p-4 border-t border-emerald-100 bg-emerald-50">
                    <h3 className="text-sm font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Area Information
                    </h3>

                    <div className="bg-white rounded-xl p-4 border border-emerald-200 space-y-3">
                      <div>
                        <p className="text-lg font-bold text-slate-800">
                          {selectedArea.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-1 capitalize">
                          {selectedArea.type} Zone
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-emerald-50 rounded-lg p-2.5 border border-emerald-200">
                          <p className="text-xs text-emerald-700">
                            Property Value
                          </p>
                          <p className="font-bold text-sm text-slate-800">
                            {selectedArea.currency}{" "}
                            {selectedArea.price?.toLocaleString()}/sqft
                          </p>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-2.5 border border-emerald-200">
                          <p className="text-xs text-emerald-700">Population</p>
                          <p className="font-bold text-sm text-slate-800">
                            {selectedArea.population?.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-2.5 border border-emerald-200">
                          <p className="text-xs text-emerald-700">FAR</p>
                          <p className="font-bold text-sm text-slate-800">
                            {selectedArea.regulations?.far || "N/A"}
                          </p>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-2.5 border border-emerald-200">
                          <p className="text-xs text-emerald-700">
                            Ground Cov.
                          </p>
                          <p className="font-bold text-sm text-slate-800">
                            {selectedArea.regulations?.groundCoverage || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <Globe className="w-16 h-16 text-emerald-200 mb-4" />
              <h3 className="text-lg font-bold text-slate-700">
                Welcome to UrbanForm Pro
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                Select a city from the map or dropdown to begin your analysis.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative">
        {!mapLoaded && (
          <div className="absolute inset-0 bg-slate-100 z-50 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto mb-4" />
              <p className="text-slate-600 font-medium">Initializing Map...</p>
            </div>
          </div>
        )}

        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Map Controls - Moved to Top Center */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
          {isChangingStyle && (
            <div className="bg-white rounded-lg shadow-lg px-3 py-2 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span className="text-sm text-slate-700">
                Changing map style...
              </span>
            </div>
          )}
          <div className="bg-white rounded-lg shadow-lg p-1 flex gap-1">
            <button
              onClick={() => changeMapStyle("streets")}
              disabled={isChangingStyle}
              className={`p-2 rounded-lg transition-colors ${
                mapStyle === "streets"
                  ? "bg-emerald-100 text-emerald-700"
                  : "hover:bg-slate-100 text-slate-700"
              } ${isChangingStyle ? "opacity-50 cursor-not-allowed" : ""}`}
              title="Streets View"
            >
              <MapPin className="w-5 h-5" />
            </button>
            <button
              onClick={() => changeMapStyle("outdoor")}
              disabled={isChangingStyle}
              className={`p-2 rounded-lg transition-colors ${
                mapStyle === "outdoor"
                  ? "bg-emerald-100 text-emerald-700"
                  : "hover:bg-slate-100 text-slate-700"
              } ${isChangingStyle ? "opacity-50 cursor-not-allowed" : ""}`}
              title="Outdoor View"
            >
              <Building2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => changeMapStyle("satellite")}
              disabled={isChangingStyle}
              className={`p-2 rounded-lg transition-colors ${
                mapStyle === "satellite"
                  ? "bg-emerald-100 text-emerald-700"
                  : "hover:bg-slate-100 text-slate-700"
              } ${isChangingStyle ? "opacity-50 cursor-not-allowed" : ""}`}
              title="Satellite View"
            >
              <Globe className="w-5 h-5" />
            </button>
            <button
              onClick={() => changeMapStyle("hybrid")}
              disabled={isChangingStyle}
              className={`p-2 rounded-lg transition-colors ${
                mapStyle === "hybrid"
                  ? "bg-emerald-100 text-emerald-700"
                  : "hover:bg-slate-100 text-slate-700"
              } ${isChangingStyle ? "opacity-50 cursor-not-allowed" : ""}`}
              title="Hybrid View"
            >
              <Layers className="w-5 h-5" />
            </button>
            <button
              onClick={() => changeMapStyle("dataviz")}
              disabled={isChangingStyle}
              className={`p-2 rounded-lg transition-colors ${
                mapStyle === "dataviz"
                  ? "bg-emerald-100 text-emerald-700"
                  : "hover:bg-slate-100 text-slate-700"
              } ${isChangingStyle ? "opacity-50 cursor-not-allowed" : ""}`}
              title="Dataviz View"
            >
              <Building className="w-5 h-5" />
            </button>
          </div>

          {selectedCity && (
            <>
              <div className="bg-white rounded-lg shadow-lg p-1">
                <button
                  onClick={toggleDrawMode}
                  className={`p-2 rounded-lg transition-colors ${
                    isDrawingMode
                      ? "bg-emerald-500 text-white"
                      : "hover:bg-slate-100 text-slate-700"
                  }`}
                  title="Draw Parcel"
                >
                  <Pencil className="w-5 h-5" />
                </button>
              </div>
              <div className="bg-white rounded-lg shadow-lg px-3 py-2">
                <button
                  onClick={() => {
                    setSelectedCity(null);
                    if (mapRef.current) {
                      mapRef.current.flyTo({
                        center: [0, 20],
                        zoom: 2,
                        duration: 2000,
                      });
                    }
                  }}
                  className="flex items-center gap-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-md shadow-sm transition-colors"
                  title="Back to World View"
                >
                  <Globe className="w-4 h-4" />
                  World View
                </button>
              </div>
            </>
          )}
        </div>

        {/* Sidebar Toggle - Moved to Top Left */}
        <div className="absolute top-4 left-4 z-20">
          <div className="bg-white rounded-lg shadow-lg p-1">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Toggle Sidebar"
            >
              <Menu className="w-5 h-5 text-slate-700" />
            </button>
          </div>
        </div>

        {/* Drawing Info Overlay */}
        {isDrawingMode && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white px-6 py-3 rounded-full shadow-xl border border-emerald-200 flex items-center gap-4 animate-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="font-medium text-slate-800">
                Drawing Mode Active
              </span>
            </div>
            <div className="h-4 w-px bg-slate-200" />
            <div className="text-sm text-slate-600">
              {drawingPoints > 0
                ? `${drawingPoints} points placed`
                : "Click to start drawing"}
            </div>
            {currentDrawingArea > 0 && (
              <>
                <div className="h-4 w-px bg-slate-200" />
                <div className="text-sm font-bold text-emerald-600">
                  {currentDrawingArea.toLocaleString()} m²
                </div>
              </>
            )}
            <button
              onClick={toggleDrawMode}
              className="ml-2 p-1 hover:bg-slate-100 rounded-full"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        )}

        {/* 3D View Controls - Show after drawing */}
        {show3DView && drawnPolygon && !showReportPreview && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-green-600 px-8 py-4 rounded-2xl shadow-2xl border-2 border-white flex items-center gap-6 animate-in slide-in-from-bottom-4">
            <div className="flex flex-col gap-1">
              <span className="text-white font-bold text-lg">
                3D Visualization Active
              </span>
              <span className="text-emerald-100 text-sm">
                Viewing parcel in 3D mode
              </span>
            </div>
            <div className="h-12 w-px bg-white/30" />
            <button
              onClick={handleGenerateReport}
              className="bg-white text-emerald-600 px-6 py-3 rounded-xl font-bold hover:bg-emerald-50 transition-all shadow-lg flex items-center gap-2 hover:scale-105"
            >
              <FileText className="w-5 h-5" />
              Generate Report
            </button>
            <button
              onClick={() => {
                if (drawRef.current) {
                  drawRef.current.deleteAll();
                  handleDrawDelete();
                }
              }}
              className="bg-white/20 text-white px-4 py-3 rounded-xl font-medium hover:bg-white/30 transition-all flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Cancel
            </button>
          </div>
        )}

        {/* Zoning Modal */}
        {showZoningModal && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl transform scale-100 transition-transform">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">
                  Upload Zoning Regulations
                </h3>
                <button
                  onClick={() => setShowZoningModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-full"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="bg-emerald-50 p-4 rounded-xl mb-6 flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-emerald-900">
                    Required for Analysis
                  </p>
                  <p className="text-xs text-emerald-700 mt-1">
                    To ensure accurate zoning compliance checks, please upload
                    the zoning regulations document for {selectedCity?.name}.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Upload className="w-5 h-5" />
                  Upload Document
                </button>
                <button
                  onClick={() => setShowZoningModal(false)}
                  className="w-full py-3 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Report Preview Modal */}
        {showReportPreview && generatedReport && (
          <ReportPreview
            report={generatedReport}
            onClose={handleCloseReport}
            onDownload={handleDownloadReport}
          />
        )}

        {/* Loading Overlay - Report Generation */}
        {isGeneratingReport && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm text-center">
              <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin mb-4" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                Analyzing Parcel
              </h3>
              <p className="text-slate-500">
                Our AI is evaluating zoning regulations, calculating
                buildability, and generating development scenarios...
              </p>
            </div>
          </div>
        )}

        {/* Loading Overlay - Document Upload */}
        {isUploadingDocuments && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm text-center">
              <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin mb-4" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                Uploading Documents
              </h3>
              <p className="text-slate-500">
                Processing and analyzing zoning regulations documents...
              </p>
            </div>
          </div>
        )}

        {/* Loading Overlay - 3D Visualization */}
        {isLoading3D && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm text-center">
              <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin mb-4" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                Loading 3D View
              </h3>
              <p className="text-slate-500">
                Rendering 3D buildings and terrain visualization...
              </p>
            </div>
          </div>
        )}

        {/* Loading Overlay - Loading City Data */}
        {isLoadingZones && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm text-center">
              <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin mb-4" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                Loading City Data
              </h3>
              <p className="text-slate-500">
                Fetching zoning districts and regulations for{" "}
                {selectedCity?.name}...
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default IndianUrbanForm;