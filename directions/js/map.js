mapboxgl.accessToken = 'pk.eyJ1IjoieW9oamFwYW4iLCJhIjoiY2xnYnRoOGVmMDFsbTNtbzR0eXV6a2IwZCJ9.kJYURwlqIx_cpXvi66N0uw';

const route = {
	type: 'Feature',
	geometry: {
		type: 'LineString',
		coordinates: [
			[
				140.0107770164214,
				35.87258298250099
			  ],
			  [
				140.01108665259912,
				35.8719830875413
			  ],
			  [
				140.01106020706357,
				35.870919483764226
			  ],
			  [
				140.01097339583322,
				35.870858516740086
			  ],
			  [
				140.01139587715608,
				35.87013159860949
			  ],
			  [
				140.01165631084916,
				35.8697329632556
			  ],
			  [
				140.012055642512,
				35.86926866778553
			  ],
			  [
				140.01250127214382,
				35.86890285792268
			  ],
			  [
				140.01263438269802,
				35.86873871165123
			  ],
			  [
				140.0132189116527,
				35.867359869543336
			  ],
			  [
				140.01380923137117,
				35.866285858360285
			  ],
			  [
				140.01393655450812,
				35.866323378700045
			  ],
			  [
				140.01445742151276,
				35.865591728787166
			  ],
			  [
				140.0145442327431,
				35.86541350537196
			  ],
			  [
				140.01461368172897,
				35.86535253411236
			  ],
			  [
				140.01492041474404,
				35.86475688933345
			  ],
			  [
				140.01537183314434,
				35.86455521331507
			  ],
			  [
				140.01553967012944,
				35.864395747917214
			  ],
			  [
				140.01591543533505,
				35.86420461420067
			  ],
			  [
				140.01691705687887,
				35.863427707635296
			  ],
			  [
				140.01708891772466,
				35.86332542540384
			  ],
			  [
				140.01822211957875,
				35.86349734678218
			  ],
			  [
				140.0185765796988,
				35.8635256376117
			  ],
			  [
				140.01888118274837,
				35.863552232993044
			  ],
			  [
				140.0189229350537,
				35.863670148584845
			  ],
			  [
				140.01923544473368,
				35.86368963027476
			  ],
			  [
				140.0192974405814,
				35.86383112871832
			  ]
		]
	}
};

// Define the walking route
const bounds = new mapboxgl.LngLatBounds();
route.geometry.coordinates.forEach(coord => bounds.extend(coord));

const map = new mapboxgl.Map({
	container: 'map', // ID of the container
	style: 'mapbox://styles/mapbox/satellite-v9', // Satellite style
	bounds: bounds, // Set the map extent to the bounds of the route
	fitBoundsOptions: { padding: 100 } // Add padding to the fit bounds
});

map.on('load', () => {
	// Add the route as a source
	map.addSource('route', {
		type: 'geojson',
		data: route
	});

	// Add a line layer to visualize the route
	map.addLayer({
		id: 'route',
		type: 'line',
		source: 'route',
		layout: { 'line-cap': 'round', 'line-join': 'round' },
		paint: {
			'line-color': '#ff0000',
			'line-width': 5
		}
	});

	// Create a moving marker
	const marker = new mapboxgl.Marker()
		.setLngLat(route.geometry.coordinates[0])
		.addTo(map);

	// Smooth marker animation
	let progress = 0; // Between 0 and 1
	const animationSpeed = 0.0007; // Set the animation speed (default is slower)

	function interpolate(p1, p2, t) {
		return [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])];
	}

	// Create a label for the marker
	const markerLabel = new mapboxgl.Popup({ offset: 25, className: 'popup-no-arrow marker-label' })
		.setLngLat(route.geometry.coordinates[0])
		.setText("0 seconds")
		.addTo(map);

	function updateMarkerLabel() {
		const totalSeconds = Math.floor(progress / animationSpeed);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;

		const distanceCovered = progress * route.geometry.coordinates.reduce((acc, curr, index, arr) => {
			if (index === 0) return acc;
			const prev = arr[index - 1];
			const distance = Math.sqrt(Math.pow(curr[0] - prev[0], 2) + Math.pow(curr[1] - prev[1], 2));
			return acc + distance;
		}, 0);

		const distanceInMeters = (distanceCovered * 111139).toFixed(2); // Convert degrees to meters (approximation)

		const roundedDistanceInMeters = Math.round(distanceInMeters);
		markerLabel.setText(`${minutes}分, ${roundedDistanceInMeters} meters`);
		// markerLabel.setText(`${minutes}m ${seconds}s, ${roundedDistanceInMeters} meters`);
		markerLabel.setLngLat(marker.getLngLat());
	}

	// 1) Inject buttons
	// document.body.insertAdjacentHTML('beforeend', `
	// 	<button id="playBtn">Play</button>
	// 	<button id="pauseBtn">Pause</button>
	// 	<button id="restartBtn">Restart</button>
	// `);

	let isPaused = false;
	let animationId;

	function smoothAnimateMarker() {
		const totalDistance = route.geometry.coordinates.reduce((acc, curr, index, arr) => {
			if (index === 0) return acc;
			const prev = arr[index - 1];
			const distance = Math.sqrt(Math.pow(curr[0] - prev[0], 2) + Math.pow(curr[1] - prev[1], 2));
			return acc + distance;
		}, 0);

		const distanceCovered = progress * totalDistance;
		let distanceSum = 0;
		let segment = 0;

		for (let i = 1; i < route.geometry.coordinates.length; i++) {
			const start = route.geometry.coordinates[i - 1];
			const end = route.geometry.coordinates[i];
			const segmentDistance = Math.sqrt(Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2));
			if (distanceSum + segmentDistance >= distanceCovered) {
				segment = i - 1;
				break;
			}
			distanceSum += segmentDistance;
		}

		const start = route.geometry.coordinates[segment];
		const end = route.geometry.coordinates[segment + 1];
		const segmentDistance = Math.sqrt(Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2));
		const t = (distanceCovered - distanceSum) / segmentDistance;

		marker.setLngLat(interpolate(start, end, t));
		updateMarkerLabel();
		if (!isPaused) {
			progress += animationSpeed;
			if (progress < 1) {
				animationId = requestAnimationFrame(smoothAnimateMarker);
			}
		}
	}

	// 2) Button event handlers
	document.getElementById('play').addEventListener('click', () => {
		isPaused = false;
		if (progress < 1) {
			animationId = requestAnimationFrame(smoothAnimateMarker);
		}
	});

	document.getElementById('pause').addEventListener('click', () => {
		isPaused = true;
		if (animationId) {
			cancelAnimationFrame(animationId);
		}
	});

	document.getElementById('restart').addEventListener('click', () => {
		isPaused = false;
		progress = 0;
		marker.setLngLat(route.geometry.coordinates[0]);
		animationId = requestAnimationFrame(smoothAnimateMarker);
	});

	// 3) Start animation
	smoothAnimateMarker();

	// Add labels
	new mapboxgl.Popup({ offset: 25, className: 'popup-no-arrow' })
		.setLngLat(route.geometry.coordinates[0])
		.setText("Abiko Station")
		.addTo(map);

	new mapboxgl.Popup({ offset: 25, className: 'popup-no-arrow' })
		.setLngLat(route.geometry.coordinates[route.geometry.coordinates.length - 1])
		// add images/LOGO.svg in the text box
		.setHTML('<img src="images/LOGO.svg" alt="LOGO" width="100" height="40">')
		.addTo(map);

	// add label to teganuma park
	new mapboxgl.Popup({ offset: 25, className: 'popup-no-arrow' })
	.setLngLat(route.geometry.coordinates[15])
		.setText("Teganuma Park")
		.addTo(map);

	// add label to teganuma lake 
	new mapboxgl.Popup({ offset: 25, className: 'popup-no-arrow marker-label-teganuma' })
	.setLngLat([140.01317800254907,35.86195222857434])
		.setText("Teganuma Lake")
		.addTo(map);
});