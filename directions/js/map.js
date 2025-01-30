mapboxgl.accessToken = 'pk.eyJ1IjoieW9oamFwYW4iLCJhIjoiY2xnYnRoOGVmMDFsbTNtbzR0eXV6a2IwZCJ9.kJYURwlqIx_cpXvi66N0uw';

// Project configurations
const nhuma = {
		startLabel: '我孫子駅',
		endLabel: 'NHUMA',
		endLogo: 'images/nhuma.svg',
		routeColor: '#FF5A16',
		geojsonFile: 'nhuma.geojson',
		year: 1984,
		timelineYears: [1961, 1974, 1979, 1984, 1987, 2008, 2019, 2023],
		mapLabels: [
				{
						lat: 35.863,
						lon: 140.013,
						text: 'Teganuma Lake',
						fontSize: 25
				},
				{
						lat: 35.86565147568527,
						lon: 140.01453414701723,
						text: 'Teganuma Park',
						fontSize: 12
				}
		]
};

const reitaku = {
		startLabel: '南柏駅',
		endLabel: '麗澤大学',
		endLogo: 'images/reitaku.svg',
		routeColor: '#005B49',
		geojsonFile: 'reitaku.geojson',
		year: 1984,
		timelineYears: [1961, 1974, 1979, 1984, 1987, 2008, 2012, 2014, 2019, 2023]
		// No mapLabels for reitaku configuration
};

// Function to get URL parameters
function getUrlParam(param) {
		const urlParams = new URLSearchParams(window.location.search);
		return urlParams.get(param);
}

// Select configuration based on URL parameter
let config = nhuma; // Default configuration
const routeParam = getUrlParam('route');

if (routeParam) {
		// Check if the parameter matches any project configuration
		const configMap = {
				'nhuma': nhuma,
				'reitaku': reitaku
		};
		
		config = configMap[routeParam.toLowerCase()] || nhuma;
}

// Override configuration with URL parameters if they exist
const urlParams = new URLSearchParams(window.location.search);
const paramOverrides = {
    startLabel: urlParams.get('start'),
    endLabel: urlParams.get('end'),
    endLogo: urlParams.get('logo'),
    routeColor: urlParams.get('color'),
    geojsonFile: urlParams.get('geojson'),
    year: parseInt(urlParams.get('year')),
    timelineYears: urlParams.get('years') ? urlParams.get('years').split(',').map(Number) : null
};

// Apply overrides if parameters exist
Object.keys(paramOverrides).forEach(key => {
    if (paramOverrides[key] !== null && paramOverrides[key] !== undefined) {
        if (key === 'routeColor' && !paramOverrides[key].startsWith('#')) {
            config[key] = '#' + paramOverrides[key]; // Ensure color has # prefix
        } else {
            config[key] = paramOverrides[key];
        }
    }
});

// Handle mapLabels separately as it needs special parsing
const mapLabelsParam = urlParams.get('labels');
if (mapLabelsParam) {
    try {
        config.mapLabels = JSON.parse(decodeURIComponent(mapLabelsParam));
    } catch (e) {
        console.error('Error parsing mapLabels parameter:', e);
    }
}

// Update page title with configuration values
document.title = `Directions from ${config.startLabel} to ${config.endLabel}`;

// Set CSS variable for the route color
document.documentElement.style.setProperty('--route-color', config.routeColor);

// Setup parameters
const startLabel = config.startLabel; // Label for the start point
const endLabel = config.endLabel; // Label for the end point
const endLogo = config.endLogo; // Logo for the end point
const routeColor = config.routeColor; // Color of the route
const geojsonfile = config.geojsonFile; // GeoJSON file for the route
let year = config.year; // Year for the route
const timelineYears = config.timelineYears; // Timeline years

// Animation speed parameters
const defaultSpeed = 0.001; // Default animation speed
const minSpeed = -0.003;     // Maximum reverse speed
const maxSpeed = 0.003;      // Maximum forward speed
const speedStep = 0.0003;    // Speed change per arrow key press

// Set CSS variable for the route color
document.documentElement.style.setProperty('--route-color', routeColor);

// Constants for walking speed
const WALKING_SPEED = 5; // km/h
const METERS_PER_SECOND = WALKING_SPEED * 1000 / 3600; // Convert km/h to m/s

// Function to calculate center of coordinates
function calculateCenter(coordinates) {
		const sum = coordinates.reduce((acc, coord) => {
				return [acc[0] + coord[0], acc[1] + coord[1]];
		}, [0, 0]);
		return [
				sum[0] / coordinates.length,
				sum[1] / coordinates.length
		];
}

// Map style configuration
const mapStyles = {
		'normal': 'mapbox://styles/mapbox/streets-v11',
		'2023': 'mapbox://styles/mapbox/satellite-v9',
		'1974': 'gazo1',
		'1961': 'ort_old10',
		'1979': 'gazo2',
		'1984': 'gazo3',
		'1987': 'gazo4',
		'2008': 'nendophoto2008',
		'2012': 'nendophoto2012',
		'2014': 'nendophoto2014',
		'2019': 'nendophoto2019'
};

function getMapStyle(year) {
		// Convert year to string and find exact match or closest year
		const yearStr = year.toString();
		let style = mapStyles[yearStr];
		
		// If no exact match, find closest available year
		if (!style) {
				const years = Object.keys(mapStyles)
						.filter(y => y !== 'normal')
						.map(Number)
						.filter(y => !isNaN(y))
						.sort((a, b) => a - b);
				
				const closestYear = years.reduce((prev, curr) => {
						return Math.abs(curr - year) < Math.abs(prev - year) ? curr : prev;
				});
				
				style = mapStyles[closestYear.toString()];
		}

	console.log(style);
	console.log(yearStr);
		if (yearStr === 'normal' || yearStr === '2023') {
				return style;
		} else {
				return {
						version: 8,
						sources: {
								gsi: {
										type: 'raster',
										tiles: [
												`https://cyberjapandata.gsi.go.jp/xyz/${style}/{z}/{x}/{y}.${style === 'ort_old10' ? 'png' : (style.startsWith('nendophoto') ? 'png' : 'jpg')}`
										],
										tileSize: 256,
										attribution: '国土地理院'
								}
						},
						layers: [{
								id: 'gsi-layer',
								type: 'raster',
								source: 'gsi',
								minzoom: 0,
								maxzoom: 18
						}]
				};
		}
}

const mapStyle = getMapStyle(year);

// Initialize the map with the selected style
const map = new mapboxgl.Map({
		container: 'map',
		style: mapStyle,
		zoom: 10
});

// Timeline initialization
const yearMarkersContainer = document.getElementById('yearMarkers');
const timeSlider = document.getElementById('timeSlider');
const startyear = config.timelineYears[0];
const endyear = config.timelineYears[config.timelineYears.length - 1];

// Add these functions before creating year markers
function getMarkerPosition(year) {
		return ((year - startyear) / (endyear - startyear)) * 100;
}

function adjustMarkerPositions(years) {
		const minGap = 15; // Minimum gap between markers in percentage
		const positions = years.map(year => ({
				year,
				originalPos: getMarkerPosition(year),
				pos: getMarkerPosition(year)
		}));

		// Sort by position
		positions.sort((a, b) => a.pos - b.pos);

		// Adjust positions to maintain minimum gap
		for (let i = 1; i < positions.length; i++) {
				const prev = positions[i - 1];
				const curr = positions[i];
				const gap = curr.pos - prev.pos;

				if (gap < minGap) {
						// If too close, push current marker right
						const push = minGap - gap;
						curr.pos += push;

						// Push all subsequent markers by the same amount
						for (let j = i + 1; j < positions.length; j++) {
								positions[j].pos += push;
						}
				}
		}

		// If last marker is beyond 100%, scale everything back
		if (positions[positions.length - 1].pos > 100) {
				const scale = 100 / positions[positions.length - 1].pos;
				positions.forEach(p => p.pos *= scale);
		}

		return positions;
}

// Replace the year markers creation code with this:
const adjustedPositions = adjustMarkerPositions(timelineYears);
// Find the closest year to highlight initially
const initialYear = year;
const closestYear = timelineYears.reduce((prev, curr) => {
    return Math.abs(curr - initialYear) < Math.abs(prev - initialYear) ? curr : prev;
});

adjustedPositions.forEach(({ year, pos }) => {
    const marker = document.createElement('div');
    marker.className = 'year-marker';
    // Highlight the closest year to the initial year
    if (year === closestYear) {
        marker.classList.add('selected');
        timeSlider.value = year;
    }
    marker.textContent = year;
    marker.style.left = `${pos}%`;
    marker.addEventListener('click', () => {
        document.querySelectorAll('.year-marker').forEach(m => m.classList.remove('selected'));
        marker.classList.add('selected');
        timeSlider.value = year;
        updateMapStyle(year);
    });
    yearMarkersContainer.appendChild(marker);
});

// Remove this event listener since we're not using the slider directly anymore
// timeSlider.addEventListener('input', (e) => {
//     const selectedYear = parseInt(e.target.value);
//     updateMapStyle(selectedYear);
// });

// Add this helper function to initialize route layers
function initializeRouteLayers() {
		if (!map.getSource('route')) {
				map.addSource('route', {
						type: 'geojson',
						data: route
				});
		}

		if (!map.getLayer('route-outline')) {
				map.addLayer({
						id: 'route-outline',
						type: 'line',
						source: 'route',
						layout: {
								'line-cap': 'round',
								'line-join': 'round'
						},
						paint: {
								'line-color': '#ffffff',
								'line-width': 12,
								'line-opacity': 0.6
						}
				});
		}

		if (!map.getLayer('route')) {
				map.addLayer({
						id: 'route',
						type: 'line',
						source: 'route',
						layout: {
								'line-cap': 'round',
								'line-join': 'round'
						},
						paint: {
								'line-color': routeColor,
								'line-width': 8,
								'line-opacity': 0.6
						}
				});
			}
		}
		
		let route, geometry;
		let marker, markerLabel;  // Declare these at the top level
		
		function updateMapStyle(selectedYear) {
			console.log("time warp to " + selectedYear);
			const newStyle = getMapStyle(selectedYear);
			
			 // Store the current map center and zoom
			const currentCenter = map.getCenter();
			const currentZoom = map.getZoom();
		
			// Update style
			map.setStyle(typeof newStyle === 'string' ? newStyle : newStyle);
		
			// Wait for the style to load before re-adding layers and markers
			map.once('style.load', () => {
				console.log("style loaded");
		
				// Restore the map view
				map.setCenter(currentCenter);
				map.setZoom(currentZoom);
		
				// Always remove existing layers first
				if (map.getLayer('route')) map.removeLayer('route');
				if (map.getLayer('route-outline')) map.removeLayer('route-outline');
				if (map.getSource('route')) map.removeSource('route');
		
				// Add the route source
				map.addSource('route', {
					type: 'geojson',
					data: route
				});
		
				// Add route outline
				map.addLayer({
					id: 'route-outline',
					type: 'line',
					source: 'route',
					layout: {
						'line-cap': 'round',
						'line-join': 'round'
					},
					paint: {
						'line-color': '#ffffff',
						'line-width': 12,
						'line-opacity': 0.6
					}
				});
		
				// Add route line
				map.addLayer({
					id: 'route',
					type: 'line',
					source: 'route',
					layout: {
						'line-cap': 'round',
						'line-join': 'round'
					},
					paint: {
						'line-color': routeColor,
						'line-width': 8,
						'line-opacity': 0.6
					}
				});
				
				// Re-add moving marker if it exists
				if (marker) {
					marker.addTo(map);
				}
				
				// Re-add marker label if it exists
				if (markerLabel) {
					markerLabel.addTo(map);
				}
		
				// Re-add route start/end labels
				addRouteLabels();
		
				// Re-add map labels
				if (config.mapLabels) {
					addMapLabels();
				}
			});
		
			// Update the year variable
			year = selectedYear;

			initializeRouteLayers()
		}
		
		// Add these helper functions
		function addRouteLabels() {
				// Add start label
				new mapboxgl.Popup({
						offset: 25,
						className: 'popup-no-arrow',
						closeButton: false,
						closeOnClick: false
				})
				.setLngLat(geometry.coordinates[0])
				.setText(startLabel)
				.addTo(map);
		
				// Add end label
				new mapboxgl.Popup({
						offset: 25,
						className: 'popup-no-arrow marker-label-destination',
						closeButton: false,
						closeOnClick: false
				})
				.setLngLat(geometry.coordinates[geometry.coordinates.length - 1])
				.setHTML('<img src="' + endLogo + '" alt="' + endLabel + '" width="100" height="40">')
				.addTo(map);
		}
		
		function addMapLabels() {
				config.mapLabels.forEach(label => {
						const popup = new mapboxgl.Popup({
								offset: 25,
								className: 'popup-no-arrow map-label',
								closeButton: false,
								closeOnClick: false
						})
						.setLngLat([label.lon, label.lat])
						.setText(label.text)
						.addTo(map);
		
						if (label.fontSize) {
								const popupElement = popup.getElement();
								popupElement.style.fontSize = `${label.fontSize}px`;
						}
				});
		}
		
		// Load route data from GeoJSON file
		fetch('./data/' + geojsonfile)
				.then(response => response.json())
				.then(routeData => {
						route = routeData;
						console.log(route);
						geometry = route.features[0].geometry;
		
						// Calculate and set the center
						const center = calculateCenter(geometry.coordinates);
						map.setCenter(center);
		
						// Define the walking route bounds
						const bounds = new mapboxgl.LngLatBounds();
						route.features[0].geometry.coordinates.forEach(coord => bounds.extend(coord));
		
						// Fit map to route bounds
						map.fitBounds(bounds, { padding: 100 });
		
						// Initialize the map with the route
						initializeMap();
				})
				.catch(error => console.error('Error loading route:', error));
		
		// Move all the map initialization code into a function
		function initializeMap() {
			map.on('load', () => {
				// Add route layers
				initializeRouteLayers();
		
				// Add route labels (start and end)
				addRouteLabels();
		
				// Add map labels if they exist
				if (config.mapLabels) {
						addMapLabels();
				}
		
				// Create a moving marker (now assigned to module-level variable)
				marker = new mapboxgl.Marker({ 
					color: routeColor,
					element: createMarkerElement()
				})
				.setLngLat(geometry.coordinates[0])
				.addTo(map);
		
				// Add this helper function to create a custom marker element with white border
				function createMarkerElement() {
					const el = document.createElement('div');
					el.className = 'mapboxgl-marker';
					el.style.backgroundColor = '#ffffff';  // Changed to white background
					el.style.width = '30px';
					el.style.height = '30px';
					el.style.borderRadius = '50%';
					el.style.border = `3px solid ${routeColor}`;  // Using routeColor for border
					el.style.boxShadow = '0 0 4px rgba(0,0,0,0.3)';
					el.style.backgroundImage = "url('../images/walk.gif')";
					el.style.backgroundPosition = 'center';
					el.style.backgroundRepeat = 'no-repeat';
					el.style.backgroundSize = '20px 20px';
					el.style.pointerEvents = 'none'; // Disable pointer events on the marker
					return el;
				}
		
				// Smooth marker animation
				let progress = 0; // Between 0 and 1
				let direction = 1; // 1 for forward, -1 for reverse
				let animationSpeed = defaultSpeed;  // Initialize with default speed
		
				function interpolate(p1, p2, t) {
					return [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])];
				}
		
				// Create a label for the marker (now assigned to module-level variable)
				markerLabel = createMarkerLabel()
					.setLngLat(geometry.coordinates[0])
					.setText("0 seconds")
					.addTo(map);
		
				// Add map interaction handlers
				map.on('click', () => {
					if (markerLabel) {
						markerLabel.addTo(map);
					}
				});
		
				map.on('drag', () => {
					if (markerLabel) {
						markerLabel.addTo(map);
					}
				});
		
				map.on('zoom', () => {
					if (markerLabel) {
						markerLabel.addTo(map);
					}
				});
		
				function calculateRouteLength() {
					let totalLength = 0;
					for (let i = 1; i < geometry.coordinates.length; i++) {
							const from = geometry.coordinates[i - 1];
							const to = geometry.coordinates[i];
							// Calculate distance in meters
							const distance = turf.distance(
									turf.point(from),
									turf.point(to),
									{ units: 'meters' }
							);
							totalLength += distance;
					}
					return totalLength;
				}
		
				function updateMarkerLabel() {
					const routeLength = calculateRouteLength();
					const distanceCovered = progress * routeLength;
					const timeInSeconds = distanceCovered / METERS_PER_SECOND;
					const minutes = Math.floor(timeInSeconds / 60);
					const seconds = Math.floor(timeInSeconds % 60);
					
					const roundedDistanceInMeters = Math.round(distanceCovered);
					markerLabel.setText(`${minutes}分${seconds}秒, ${roundedDistanceInMeters}m`);
					markerLabel.setLngLat(marker.getLngLat());
				}
		
				let isPaused = false;
				let pausedByButton = false;
				let animationId;
		
				function smoothAnimateMarker(manual = false) {
					const totalDistance = geometry.coordinates.reduce((acc, curr, index, arr) => {
						if (index === 0) return acc;
						const prev = arr[index - 1];
						const distance = Math.sqrt(Math.pow(curr[0] - prev[0], 2) + Math.pow(curr[1] - prev[1], 2));
						return acc + distance;
					}, 0);
		
					const distanceCovered = progress * totalDistance;
					let distanceSum = 0;
					let segment = 0;
		
					for (let i = 1; i < geometry.coordinates.length; i++) {
						const start = geometry.coordinates[i - 1];
						const end = geometry.coordinates[i];
						const segmentDistance = Math.sqrt(Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2));
						if (distanceSum + segmentDistance >= distanceCovered) {
							segment = i - 1;
							break;
						}
						distanceSum += segmentDistance;
					}
		
					const start = geometry.coordinates[segment];
					const end = geometry.coordinates[segment + 1];
					const segmentDistance = Math.sqrt(Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2));
					const t = (distanceCovered - distanceSum) / segmentDistance;
		
					marker.setLngLat(interpolate(start, end, t));
					updateMarkerLabel();
					// Replace setCenter with jumpTo without altering zoom level
					map.jumpTo({
						center: marker.getLngLat()
						// zoom: 16 // Removed to keep user's zoom level
					});
		
					// Update slider value with higher precision
					slider.value = progress * 1000;
		
					if (!isPaused) {
						if ((progress < 1 && direction > 0) || (progress > 0 && direction < 0)) {
							progress += (direction * Math.abs(animationSpeed));
							if (progress > 1) progress = 1;
							if (progress < 0) {
								progress = 0;
								direction = 1; // Switch to forward direction
								animationSpeed = Math.abs(animationSpeed); // Make speed positive
								isPaused = true; // Pause the animation
								pausedByButton = true;
								playPauseButton.textContent = 'Play';
								if (animationId) cancelAnimationFrame(animationId);
								return;
							}
							animationId = requestAnimationFrame(smoothAnimateMarker);
						} else {
							// Stop at endpoints
							progress = direction > 0 ? 1 : 0;
							marker.setLngLat(geometry.coordinates[progress === 1 ? geometry.coordinates.length - 1 : 0]);
							slider.value = progress * 1000;
							playPauseButton.textContent = 'Replay';
						}
					}
				}
		
				const slider = document.getElementById('progressSlider');
				const playPauseButton = document.getElementById('playPauseButton');
		
				playPauseButton.addEventListener('click', () => {
					if (progress >= 1) {
						// Restart the animation
						progress = 0;
						slider.value = 0;
						marker.setLngLat(geometry.coordinates[0]);
						markerLabel.setLngLat(geometry.coordinates[0]);
						markerLabel.setText("0 seconds");
						isPaused = false;
						pausedByButton = false;
						playPauseButton.textContent = 'Pause';
						animationId = requestAnimationFrame(smoothAnimateMarker);
					} else if (!isPaused) {
						isPaused = true;
						pausedByButton = true;
						playPauseButton.textContent = 'Play';
						if (animationId) cancelAnimationFrame(animationId);
					} else {
						isPaused = false;
						pausedByButton = false;
						playPauseButton.textContent = 'Pause';
						if (progress < 1) animationId = requestAnimationFrame(smoothAnimateMarker);
					}
				});
		
				slider.addEventListener('mousedown', () => {
					isPaused = true;
					if (animationId) cancelAnimationFrame(animationId);
				});
		
				slider.addEventListener('input', (e) => {
					// Convert slider value [0..1000] to progress [0..1]
					progress = parseFloat(e.target.value) / 1000;
					smoothAnimateMarker(true); // true indicates manual slider move
				});
		
				slider.addEventListener('mouseup', () => {
					if (!pausedByButton && progress < 1) {
						isPaused = false;
						playPauseButton.textContent = 'Pause';
						animationId = requestAnimationFrame(smoothAnimateMarker);
					}
				});
		
				function startButtonHandler() {
					startButton.style.display = 'none';
					document.getElementById('sliderContainer').style.display = 'flex';
					map.flyTo({
						center: geometry.coordinates[0],
						zoom: 16,
						speed: 0.5,
						curve: 1
					});
					map.once('moveend', () => {
						animationId = requestAnimationFrame(smoothAnimateMarker);
						playPauseButton.textContent = 'Pause';
					});
				}
		
				// Add event listener for the central play button
				const startButton = document.getElementById('startButton');
		
				startButton.addEventListener('click', startButtonHandler);
		
				// Add labels
				new mapboxgl.Popup({ offset: 25, className: 'popup-no-arrow' })
					.setLngLat(geometry.coordinates[0])
					.setText(startLabel)
					.addTo(map);
		
				new mapboxgl.Popup({ offset: 25, className: 'popup-no-arrow marker-label-destination' })
					.setLngLat(geometry.coordinates[geometry.coordinates.length - 1])
					// add images/LOGO.svg in the text box
					.setHTML('<img src="' + endLogo + '" alt="' + endLabel + '" width="100" height="40">')
					.addTo(map);
		
				// add label to teganuma park
				// new mapboxgl.Popup({ offset: 25, className: 'popup-no-arrow' })
				// .setLngLat(geometry.coordinates[15])
				// 	.setText("Teganuma Park")
				// 	.addTo(map);
		
				// // add label to teganuma lake 
				// new mapboxgl.Popup({ offset: 25, className: 'popup-no-arrow marker-label-teganuma' })
				// .setLngLat([140.01317800254907,35.86195222857434])
				// 	.setText("Teganuma Lake")
				// 	.addTo(map);
		
				// Add keyboard controls
				document.addEventListener('keydown', (e) => {
					if (e.code === 'Space') {
						e.preventDefault();
						const startButton = document.getElementById('startButton');
						if (startButton.style.display !== 'none') {
							startButtonHandler();
						} else {
							playPauseButton.click();
						}
					} else if (e.code === 'ArrowLeft') {
						e.preventDefault();
						if (progress >= 1) {
							// If at the end, start playing in reverse
							direction = -1;
							animationSpeed = speedStep;
							isPaused = false;
							playPauseButton.textContent = 'Pause';
							requestAnimationFrame(smoothAnimateMarker);
						} else if (progress > 0) {
							if (direction === 1) {
								direction = -1;
								animationSpeed = speedStep;
							} else {
								animationSpeed = Math.min(Math.abs(animationSpeed) + speedStep, Math.abs(minSpeed));
							}
						}
					} else if (e.code === 'ArrowRight' && progress < 1) {
						e.preventDefault();
						if (direction === -1) {
							direction = 1;
							animationSpeed = speedStep;
						} else {
							animationSpeed = Math.min(animationSpeed + speedStep, maxSpeed);
						}
					}
				});
			});
			}
		
		function createMarkerLabel() {
			return new mapboxgl.Popup({
				offset: 0,
				className: 'popup-no-arrow marker-label',
				closeButton: false,
				closeOnClick: false,
				focusAfterOpen: false,
				anchor: 'bottom'
			});
		}
