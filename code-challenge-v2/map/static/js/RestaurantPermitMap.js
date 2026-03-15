import React, { useEffect, useState } from "react"

import { MapContainer, TileLayer, GeoJSON } from "react-leaflet"

import "leaflet/dist/leaflet.css"

// GeoJSON file containing Chicago community area shapes
import RAW_COMMUNITY_AREAS from "../../../data/raw/community-areas.geojson"


/**
 * Dropdown component for selecting the year filter
 */
function YearSelect({ filterVal, setFilterVal }) {

  // Start year for dropdown
  const startYear = 2026

  // Generate years 2026 → 2016
  const years = [...Array(11).keys()].map((increment) => {
    return startYear - increment
  })

  // Create dropdown options
  const options = years.map((year) => {
    return (
      <option value={year} key={year}>
        {year}
      </option>
    )
  })

  return (
    <>
      <label htmlFor="yearSelect" className="fs-3">
        Filter by year:
      </label>

      {/* Controlled dropdown so React keeps the selected value */}
      <select
        id="yearSelect"
        value={filterVal}
        className="form-select form-select-lg mb-3"
        onChange={(e) => setFilterVal(Number(e.target.value))}
      >
        {options}
      </select>
    </>
  )
}


export default function RestaurantPermitMap() {

  /**
   Color scale used for shading community areas
   */
  const communityAreaColors = [
    "#eff3ff",
    "#bdd7e7",
    "#6baed6",
    "#2171b5"
  ]

  /**
   React state variables
   */
  const [currentYearData, setCurrentYearData] = useState([])
  const [year, setYear] = useState(2026)
  const [totalPermits, setTotalPermits] = useState(0)
  const [maxNumPermits, setMaxNumPermits] = useState(0)


  /**
   Fetch permit data whenever the selected year changes.
   Uses the year filter to request data for that year from the backend.
   */
  useEffect(() => {
    const url = `${window.location.origin}/map-data/?year=${year}`

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (!Array.isArray(data)) {
          setCurrentYearData([])
          setTotalPermits(0)
          setMaxNumPermits(0)
          return
        }
        setCurrentYearData(data)
        const total = data.reduce((sum, area) => sum + (area.num_permits || 0), 0)
        setTotalPermits(total)
        const max = data.length
          ? Math.max(...data.map((a) => a.num_permits || 0))
          : 0
        setMaxNumPermits(max)
      })
      .catch(() => {
        setCurrentYearData([])
        setTotalPermits(0)
        setMaxNumPermits(0)
      })
  }, [year])


  /**
   Returns a color depending on how large the permit percentage is
   */
  function getColor(percentageOfPermits) {

    if (percentageOfPermits > 0.5)
      return communityAreaColors[3]

    if (percentageOfPermits > 0.25)
      return communityAreaColors[2]

    if (percentageOfPermits > 0.1)
      return communityAreaColors[1]

    return communityAreaColors[0]
  }


  /**
   Apply color and popup behavior to each map polygon
   */
  function setAreaInteraction(feature, layer) {

    /**
     Extract community name from the GeoJSON (some files use "name", others "community")
     */
    const areaName = feature.properties.name || feature.properties.community || "Unknown"

    /**
     Find the matching community area data from the API
     Normalize names to uppercase to avoid case mismatch
     */
    const areaData = currentYearData.find(
      (a) =>
        a.name &&
        a.name.toUpperCase() === areaName.toUpperCase()
    )

    /**
     If no data exists, default permit count to 0
     */
    const permitCount = areaData
      ? areaData.num_permits
      : 0


    /**
     Determine percentage of permits for shading
     */
    const percentage =
      totalPermits > 0
        ? permitCount / totalPermits
        : 0


    /**
     Apply shading style to the community polygon
     */
    layer.setStyle({
      fillColor: getColor(percentage),
      fillOpacity: 0.7,
      color: "#555",
      weight: 1
    })


    /**
     Show popup with permit information when hovering
     */
    layer.on("mouseover", () => {

      layer.bindPopup(
        `<strong>${areaName}</strong><br/>
         Year: ${year}<br/>
         Restaurant permits: ${permitCount}`
      )

      layer.openPopup()
    })


    /**
     Close popup when the mouse leaves the area
     */
    layer.on("mouseout", () => {
      layer.closePopup()
    })
  }


  return (
    <>
      {/* Year filter dropdown */}
      <YearSelect
        filterVal={year}
        setFilterVal={setYear}
      />

      {/* Display total permits issued for selected year */}
      <p className="fs-4">
        Restaurant permits issued this year: {totalPermits}
      </p>

      {/* Display max permits in a single community area */}
      <p className="fs-4">
        Maximum number of restaurant permits in a single area: {maxNumPermits}
      </p>


      {/* Leaflet map container */}
      <MapContainer
        id="restaurant-map"
        center={[41.88, -87.62]}
        zoom={10}
      >

        {/* Base map tiles */}
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png"
        />

        {/* Remount when year or data changes so onEachFeature runs with latest counts and shading */}
        <GeoJSON
          data={RAW_COMMUNITY_AREAS}
          onEachFeature={setAreaInteraction}
          key={`${year}-${currentYearData.length}`}
        />

      </MapContainer>
    </>
  )
}