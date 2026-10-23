import React, { useEffect, useMemo, useRef } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { hasSchoolCoordinates } from './schoolMapCoordinates';
import type { HomepageSchoolMapEntry } from '../../types';

const HESSEN_CENTER: L.LatLngExpression = [50.5, 8.9];

const getSchoolCoordinate = (school: HomepageSchoolMapEntry): L.LatLng | null => {
  if (!hasSchoolCoordinates(school)) return null;

  return L.latLng(school.latitude, school.longitude);
};

const OpenStreetSchoolMap: React.FC<{ schools: HomepageSchoolMapEntry[] }> = ({ schools }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const schoolLocations = useMemo(() => {
    const locations = new Map<string, { coordinate: L.LatLng; schoolCount: number }>();

    schools.forEach((school) => {
      const coordinate = getSchoolCoordinate(school);
      if (!coordinate) return;

      const key = `${coordinate.lat.toFixed(6)},${coordinate.lng.toFixed(6)}`;
      const existingLocation = locations.get(key);
      if (existingLocation) {
        existingLocation.schoolCount += 1;
      } else {
        locations.set(key, { coordinate, schoolCount: 1 });
      }
    });

    return Array.from(locations.values());
  }, [schools]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: HESSEN_CENTER,
      zoom: 7,
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
      attributionControl: true,
    });

    map.attributionControl.setPrefix(false);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markerLayer = L.layerGroup().addTo(map);

    schoolLocations.forEach(({ coordinate, schoolCount }) => {
      const marker = L.circleMarker(coordinate, {
        radius: schoolCount > 1 ? 10 : 6,
        stroke: false,
        fill: true,
        fillColor: '#06b6d4',
        fillOpacity: 1,
        interactive: false,
        className: 'school-map-point',
      }).addTo(markerLayer);

      if (schoolCount > 1) {
        marker.bindTooltip(String(schoolCount), {
          permanent: true,
          direction: 'center',
          className: 'school-map-count',
        });
      }
    });

    const coordinates = schoolLocations.map(location => location.coordinate);
    if (coordinates.length === 1) {
      map.setView(coordinates[0], 11, { animate: false });
    } else if (coordinates.length > 1) {
      map.fitBounds(L.latLngBounds(coordinates), {
        padding: [32, 32],
        maxZoom: 11,
        animate: false,
      });
    } else {
      map.setView(HESSEN_CENTER, 7, { animate: false });
    }

    return () => {
      markerLayer.remove();
    };
  }, [schoolLocations]);

  const mappedSchoolCount = schoolLocations.reduce((count, location) => count + location.schoolCount, 0);
  const mappedSchoolLabel = mappedSchoolCount === 1 ? 'Schulstandort' : 'Schulstandorte';

  return (
    <div
      ref={mapContainerRef}
      className="h-full w-full [&_.leaflet-control-attribution]:!bg-white/85 [&_.school-map-point]:!fill-[rgb(var(--color-primary-500))] [&_.school-map-count]:!border-0 [&_.school-map-count]:!bg-primary-500 [&_.school-map-count]:!px-1.5 [&_.school-map-count]:!py-0.5 [&_.school-map-count]:!text-[10px] [&_.school-map-count]:!font-bold [&_.school-map-count]:!leading-none [&_.school-map-count]:!text-white [&_.school-map-count]:!shadow-sm [&_.school-map-count]:before:!hidden"
      role="img"
      aria-label={`${mappedSchoolCount} ${mappedSchoolLabel} auf einer OpenStreetMap-Karte. Schulen am gleichen Kartenpunkt sind in einer Markierung zusammengefasst. Angezeigt werden alle Schulen mit bekannten Kartenkoordinaten.`}
    />
  );
};


export default OpenStreetSchoolMap;
