const { useState, useEffect, useRef } = React;

// Define the component directly for browser use without module exports
const StoreLocator = () => {
  const [cities, setCities] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [error, setError] = useState(null);
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef([]);
  
  // State map for full names
  const stateMap = {
    'AL': 'Alabama',
    'AK': 'Alaska',
    'AZ': 'Arizona',
    'AR': 'Arkansas',
    'CA': 'California',
    'CO': 'Colorado',
    'CT': 'Connecticut',
    'DE': 'Delaware',
    'FL': 'Florida',
    'GA': 'Georgia',
    'HI': 'Hawaii',
    'ID': 'Idaho',
    'IL': 'Illinois',
    'IN': 'Indiana',
    'IA': 'Iowa',
    'KS': 'Kansas',
    'KY': 'Kentucky',
    'LA': 'Louisiana',
    'ME': 'Maine',
    'MD': 'Maryland',
    'MA': 'Massachusetts',
    'MI': 'Michigan',
    'MN': 'Minnesota',
    'MS': 'Mississippi',
    'MO': 'Missouri',
    'MT': 'Montana',
    'NE': 'Nebraska',
    'NV': 'Nevada',
    'NH': 'New Hampshire',
    'NJ': 'New Jersey',
    'NM': 'New Mexico',
    'NY': 'New York',
    'NC': 'North Carolina',
    'ND': 'North Dakota',
    'OH': 'Ohio',
    'OK': 'Oklahoma',
    'OR': 'Oregon',
    'PA': 'Pennsylvania',
    'RI': 'Rhode Island',
    'SC': 'South Carolina',
    'SD': 'South Dakota',
    'TN': 'Tennessee',
    'TX': 'Texas',
    'UT': 'Utah',
    'VT': 'Vermont',
    'VA': 'Virginia',
    'WA': 'Washington',
    'WV': 'West Virginia',
    'WI': 'Wisconsin',
    'WY': 'Wyoming',
    'DC': 'District of Columbia'
  };

  // Load cities when a state is selected
  useEffect(() => {
    if (!selectedState) return;
    
    const fetchCities = async () => {
      setLoadingCities(true);
      setCities([]);
      setSelectedCity(null);
      
      try {
        const response = await fetch(`/api/stores/${selectedState}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch cities for ${selectedState}`);
        }
        const data = await response.json();
        setCities(data);
        setLoadingCities(false);
      } catch (err) {
        setError(err.message);
        setLoadingCities(false);
      }
    };

    fetchCities();
  }, [selectedState]);

  // Initialize/update map when a city is selected
  useEffect(() => {
    if (selectedCity && mapRef.current) {
      if (!leafletMapRef.current) {
        initializeMap();
      } else {
        updateMapMarkers();
      }
    }
  }, [selectedCity]);

  const initializeMap = () => {
    if (!selectedCity || !selectedCity.costco.length || !selectedCity.target.length) return;
    
    // Get coordinates from the first store for initial center
    const firstCostco = selectedCity.costco[0];
    const lat = parseFloat(firstCostco.latitude);
    const lng = parseFloat(firstCostco.longitude);
    
    // Initialize map
    leafletMapRef.current = L.map(mapRef.current).setView([lat, lng], 12);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(leafletMapRef.current);
    
    // Add markers
    updateMapMarkers();
  };
  
  const updateMapMarkers = () => {
    if (!leafletMapRef.current || !selectedCity) return;
    
    // Clear existing markers
    if (markersRef.current.length) {
      markersRef.current.forEach(marker => leafletMapRef.current.removeLayer(marker));
      markersRef.current = [];
    }
    
    // Add Costco markers
    selectedCity.costco.forEach(store => {
      if (store.latitude && store.longitude) {
        const lat = parseFloat(store.latitude);
        const lng = parseFloat(store.longitude);
        
        // Create Costco marker (blue)
        const marker = L.marker([lat, lng], {
          icon: L.divIcon({
            html: '<div class="bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-white text-xs font-bold">C</div>',
            className: 'costco-marker',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          })
        }).addTo(leafletMapRef.current);
        
        // Add popup
        marker.bindPopup(`<b>Costco</b><br>${store.address}<br>Phone: ${store.phone}`);
        
        markersRef.current.push(marker);
      }
    });
    
    // Add Target markers
    selectedCity.target.forEach(store => {
      if (store.latitude && store.longitude) {
        const lat = parseFloat(store.latitude);
        const lng = parseFloat(store.longitude);
        
        // Create Target marker (red)
        const marker = L.marker([lat, lng], {
          icon: L.divIcon({
            html: '<div class="bg-red-600 rounded-full w-6 h-6 flex items-center justify-center text-white text-xs font-bold">T</div>',
            className: 'target-marker',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          })
        }).addTo(leafletMapRef.current);
        
        // Add popup
        marker.bindPopup(`<b>Target</b><br>${store.street}<br>Phone: ${store.phone}`);
        
        markersRef.current.push(marker);
      }
    });
    
    // Fit the map to show all markers
    if (markersRef.current.length > 0) {
      const group = new L.featureGroup(markersRef.current);
      leafletMapRef.current.fitBounds(group.getBounds().pad(0.1));
    }
  };

  const handleStateChange = (event) => {
    const stateCode = event.target.value;
    console.log("State selected:", stateCode);
    setSelectedState(stateCode);
  };

  const handleCitySelect = (city) => {
    // Reset map when selecting a new city
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }
    
    setSelectedCity(city);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8">Target & Costco Store Locator</h1>
      
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="state-select" className="block text-sm font-medium text-gray-700 mb-2">
              Select State
            </label>
            <select
              id="state-select"
              value={selectedState}
              onChange={handleStateChange}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Select a state --</option>
              {Object.entries(stateMap)
                .sort((a, b) => a[1].localeCompare(b[1]))
                .map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))
              }
            </select>
          </div>
          
          <div>
            <label htmlFor="city-select" className="block text-sm font-medium text-gray-700 mb-2">
              {loadingCities ? "Loading cities..." : "Select City"}
            </label>
            <select
              id="city-select"
              value={selectedCity ? selectedCity.city : ""}
              onChange={(e) => {
                const selectedCityObj = cities.find(city => city.city === e.target.value);
                handleCitySelect(selectedCityObj);
              }}
              disabled={loadingCities || !selectedState || cities.length === 0}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">
                {loadingCities 
                  ? "Loading..." 
                  : cities.length === 0 && selectedState 
                    ? "No cities with both stores found" 
                    : "-- Select a city --"}
              </option>
              {cities.map(city => (
                <option key={city.city} value={city.city}>
                  {city.city} (Target: {city.target.length}, Costco: {city.costco.length})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {!selectedState && (
        <div className="text-center p-8 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-lg">Please select a state to view available cities.</p>
        </div>
      )}
      
      {selectedState && !loadingCities && cities.length === 0 && (
        <div className="text-center p-8 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-lg">No cities found with both Target and Costco in {stateMap[selectedState]}.</p>
        </div>
      )}
      
      {loadingCities && (
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <p className="text-lg">Loading cities in {stateMap[selectedState]}...</p>
        </div>
      )}
      
      {selectedCity && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-6">
            {selectedCity.city}, {stateMap[selectedState] || selectedState}
          </h2>
          
          {/* Map */}
          <div className="map-container mb-6 border rounded-lg" ref={mapRef}></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-semibold mb-4 text-blue-600">
                Costco Locations ({selectedCity.costco.length})
              </h3>
              <div className="space-y-4">
                {selectedCity.costco.map((store, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="font-medium">Costco Warehouse</div>
                    <div>{store.address}</div>
                    {store.zip && <div>{selectedCity.city}, {stateMap[selectedState] || selectedState} {store.zip}</div>}
                    {store.phone && <div>Phone: {store.phone}</div>}
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-4 text-red-600">
                Target Locations ({selectedCity.target.length})
              </h3>
              <div className="space-y-4">
                {selectedCity.target.map((store, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="font-medium">{store.name || "Target"}</div>
                    <div>{store.street}</div>
                    {store.zip && <div>{selectedCity.city}, {stateMap[store.state] || store.state} {store.zip}</div>}
                    {store.phone && <div>Phone: {store.phone}</div>}
                    {store.url && (
                      <div className="mt-2">
                        <a 
                          href={store.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Store Website
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};