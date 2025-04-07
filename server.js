const express = require('express');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const app = express();
const PORT = 3000;

// Serve static files
app.use(express.static('public'));
app.use(express.static('components'));

// Load and parse CSV data
function loadStoreData() {
  const costcoData = fs.readFileSync(path.join(__dirname, 'data', 'costco_warehouses.csv'), 'utf8');
  const targetData = fs.readFileSync(path.join(__dirname, 'data', 'target_all_states.csv'), 'utf8');
  
  const costcoStores = Papa.parse(costcoData, { header: true }).data;
  const targetStores = Papa.parse(targetData, { header: true }).data;
  
  return { costcoStores, targetStores };
}

// Normalize state names between datasets
function normalizeState(stateCode, stateMap) {
  return stateMap[stateCode] || stateCode;
}

// Get list of all states
app.get('/api/states', (req, res) => {
  try {
    // Map of state codes to full names for state translation
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
    
    // Send back a hardcoded list of states to use as full names
    res.json(Object.values(stateMap).sort());
  } catch (error) {
    console.error('Error processing state data:', error);
    res.status(500).json({ error: 'Failed to process state data' });
  }
});

// Get cities in a state with both Target and Costco
app.get('/api/stores/:state', (req, res) => {
  try {
    const { costcoStores, targetStores } = loadStoreData();
    const requestedState = req.params.state;
    
    console.log("Fetching stores for state:", requestedState);
    
    // Create state code to full name mapping (Target uses abbreviations, Costco uses full names)
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
    
    // Reverse mapping (full name to code)
    const reverseStateMap = {};
    Object.entries(stateMap).forEach(([code, name]) => {
      reverseStateMap[name] = code;
    });
    
    // Determine if requested state is a code or full name
    let costcoStateName = requestedState;
    let targetStateCode = requestedState;
    
    if (stateMap[requestedState]) {
      // If a code was provided, get the full name for Costco
      costcoStateName = stateMap[requestedState];
    } else if (reverseStateMap[requestedState]) {
      // If a full name was provided, get the code for Target
      targetStateCode = reverseStateMap[requestedState];
    }
    
    console.log("Looking for Costco in:", costcoStateName);
    console.log("Looking for Target in:", targetStateCode);
    
    // Filter stores for the requested state
    const stateTargetStores = targetStores.filter(store => 
      store.state === targetStateCode
    );
    console.log(`Found ${stateTargetStores.length} Target stores in ${targetStateCode}`);
    
    const stateCostcoStores = costcoStores.filter(store => 
      store.state === costcoStateName
    );
    console.log(`Found ${stateCostcoStores.length} Costco stores in ${costcoStateName}`);
    
    // Normalize city names for comparison (lowercase, trim)
    const normalizeCityName = city => city?.toLowerCase().trim();
    
    // Get cities with both stores
    const targetCities = new Map();
    stateTargetStores.forEach(store => {
      const normalizedCity = normalizeCityName(store.city);
      if (normalizedCity) {
        targetCities.set(normalizedCity, store.city);
      }
    });
    
    const costcoCities = new Map();
    stateCostcoStores.forEach(store => {
      const normalizedCity = normalizeCityName(store.city);
      if (normalizedCity) {
        costcoCities.set(normalizedCity, store.city);
      }
    });
    
    // Find cities that have both Target and Costco
    const citiesWithBothStores = [...costcoCities.keys()].filter(normalizedCity => 
      targetCities.has(normalizedCity)
    );
    
    // Build response data
    const result = citiesWithBothStores.map(normalizedCity => {
      // Use original city name from Costco data
      const cityName = costcoCities.get(normalizedCity);
      
      return {
        city: cityName,
        state: costcoStateName,
        stateCode: targetStateCode,
        costco: stateCostcoStores.filter(store => 
          normalizeCityName(store.city) === normalizedCity
        ),
        target: stateTargetStores.filter(store => 
          normalizeCityName(store.city) === normalizedCity
        )
      };
    });
    
    // Sort results by city name
    result.sort((a, b) => a.city.localeCompare(b.city));
    
    res.json(result);
  } catch (error) {
    console.error('Error processing store data:', error);
    res.status(500).json({ error: 'Failed to process store data' });
  }
});

// Keep the Michigan-specific endpoint for backward compatibility
app.get('/api/michigan-stores', (req, res) => {
  try {
    const { costcoStores, targetStores } = loadStoreData();
    
    const michiganCostco = costcoStores.filter(store => store.state === 'Michigan');
    const michiganTarget = targetStores.filter(store => store.state === 'MI');
    
    // Get cities with both stores
    const costcoCities = new Set(michiganCostco.map(store => store.city?.toLowerCase().trim()));
    const targetCities = new Set(michiganTarget.map(store => store.city?.toLowerCase().trim()));
    
    const citiesWithBothStores = [...costcoCities].filter(city => targetCities.has(city));
    
    // Build response data
    const result = citiesWithBothStores.map(normalizedCity => {
      const cityStores = michiganCostco.filter(
        store => store.city?.toLowerCase().trim() === normalizedCity
      );
      const cityName = cityStores.length > 0 ? cityStores[0].city : normalizedCity;
      
      return {
        city: cityName,
        costco: michiganCostco.filter(
          store => store.city?.toLowerCase().trim() === normalizedCity
        ),
        target: michiganTarget.filter(
          store => store.city?.toLowerCase().trim() === normalizedCity
        )
      };
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error processing Michigan store data:', error);
    res.status(500).json({ error: 'Failed to process store data' });
  }
});

// Serve the index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Store locator app running at http://localhost:${PORT}`);
});