'use client'

import maplibregl, { type GeoJSONSource, type MapMouseEvent } from 'maplibre-gl'
import type { GeoJSON } from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'
const CZECHIA_CENTER: [number, number] = [15.47, 49.82]
const INITIAL_ZOOM = 7
const SOURCE_ID = 'inzeraty'
const POPUP_WIDTH_PX = 220
const POPUP_PHOTO_HEIGHT_PX = 130

type PopupListing = {
  locality: string
  photo: string | null
  price: string
  slug: string
  title: string
}

/** Vlastnosti z GeoJSON jsou netypované — sem se dostanou jen jako text. */
function readPopupListing(properties: Record<string, unknown> | null): PopupListing {
  const text = (key: keyof PopupListing): string => {
    const value = properties?.[key]
    return typeof value === 'string' ? value : ''
  }
  const photo = properties?.photo

  return {
    slug: text('slug'),
    title: text('title'),
    price: text('price'),
    locality: text('locality'),
    photo: typeof photo === 'string' && photo.length > 0 ? photo : null,
  }
}

/**
 * Obsah bubliny se skládá z prvků, ne ze slepeného HTML — název i lokalita
 * pocházejí z inzerátu zadaného uživatelem, takže by se přes ně dal do
 * stránky propašovat cizí kód.
 */
function buildPopupContent({ locality, photo, price, slug, title }: PopupListing): HTMLElement {
  const link = document.createElement('a')
  link.href = `/detail/${slug}`
  // max-width drží obsah uvnitř bubliny: maplibre kolem něj přidává vlastní
  // padding, takže samotná pevná šířka fotku přetahovala přes zaoblený roh.
  link.style.cssText = `display:block;width:${POPUP_WIDTH_PX}px;max-width:100%;color:inherit;text-decoration:none`

  if (photo) {
    const image = document.createElement('img')
    image.src = photo
    image.alt = title
    image.loading = 'lazy'
    image.style.cssText = `width:100%;height:${POPUP_PHOTO_HEIGHT_PX}px;object-fit:cover;border-radius:6px;margin-bottom:6px;background:#eef0f1`
    link.append(image)
  }

  const heading = document.createElement('div')
  heading.textContent = title
  heading.style.cssText = 'font-weight:600;color:#1a433e'

  const place = document.createElement('div')
  place.textContent = locality
  place.style.cssText = 'color:#4d585d;font-size:12px;margin-top:2px'

  const amount = document.createElement('div')
  amount.textContent = price
  amount.style.cssText = 'font-weight:600;color:#1a433e;margin-top:4px'

  link.append(heading, place, amount)
  return link
}

/** Fullscreen mapa s clustrovanými piny aktivních inzerátů (data dle viewportu). */
export function ListingsMap() {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: CZECHIA_CENTER,
      zoom: INITIAL_ZOOM,
    })
    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    if (process.env.NODE_ENV === 'development') {
      ;(window as unknown as Record<string, unknown>).__rocketMap = map
    }

    async function loadViewport() {
      const bounds = map.getBounds()
      const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()].join(
        ',',
      )
      try {
        const response = await fetch(`/api/mapa/inzeraty?bbox=${bbox}`)
        if (!response.ok) return
        const geojson: unknown = await response.json()
        const source = map.getSource<GeoJSONSource>(SOURCE_ID)
        source?.setData(geojson as GeoJSON)
      } catch {
        // Výpadek načtení pinů nesmí shodit mapu — další pohyb mapy to zopakuje.
      }
    }

    // Událost 'load' čeká i na sprity/glyfy a nemusí nikdy přijít — stačí nám
    // naparsovaný styl ('styledata'), po něm lze bezpečně přidat source a vrstvy.
    let isSetupDone = false
    const setupLayers = () => {
      if (isSetupDone || map.getSource(SOURCE_ID)) return
      isSetupDone = true
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 50,
      })
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#1a433e',
          'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 50, 26],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 12,
        },
        paint: { 'text-color': '#ffffff' },
      })
      map.addLayer({
        id: 'pin',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ['case', ['get', 'topped'], '#cfb17b', '#1a433e'],
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })

      map.on('click', 'clusters', (event: MapMouseEvent) => {
        const [feature] = map.queryRenderedFeatures(event.point, { layers: ['clusters'] })
        const clusterId = feature?.properties?.cluster_id as number | undefined
        if (clusterId === undefined) return
        const source = map.getSource<GeoJSONSource>(SOURCE_ID)
        void source?.getClusterExpansionZoom(clusterId).then((zoom) => {
          const geometry = feature?.geometry
          if (geometry?.type === 'Point') {
            map.easeTo({ center: geometry.coordinates as [number, number], zoom })
          }
        })
      })

      map.on('click', 'pin', (event: MapMouseEvent) => {
        const [feature] = map.queryRenderedFeatures(event.point, { layers: ['pin'] })
        if (!feature || feature.geometry.type !== 'Point') return
        new maplibregl.Popup({ offset: 12, maxWidth: `${POPUP_WIDTH_PX}px` })
          .setLngLat(feature.geometry.coordinates as [number, number])
          .setDOMContent(buildPopupContent(readPopupListing(feature.properties)))
          .addTo(map)
      })

      for (const layer of ['clusters', 'pin']) {
        map.on('mouseenter', layer, () => {
          map.getCanvas().style.cursor = 'pointer'
        })
        map.on('mouseleave', layer, () => {
          map.getCanvas().style.cursor = ''
        })
      }

      void loadViewport()
    }

    if (map.isStyleLoaded() || map.getStyle()) {
      setupLayers()
    } else {
      void map.once('styledata', setupLayers)
    }

    map.on('moveend', () => {
      void loadViewport()
    })

    // Kontejner mění rozměry po hydrataci (fonty, layout) — mapa se musí přizpůsobit.
    const resizeObserver = new ResizeObserver(() => {
      map.resize()
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      map.remove()
    }
  }, [])

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full">
      <div ref={containerRef} className="size-full" />
    </div>
  )
}
