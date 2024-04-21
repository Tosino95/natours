/* eslint-disable */

export const displayMap = (locations) => {
  maptilersdk.config.apiKey = 'NKxVz3GrilgwUYugxMX3';

  var bounds = [
    [-74.04728500751165, 40.68392799015035], // Southwest coordinates
    [-73.91058699000139, 40.87764500765852], // Northeast coordinates
  ];

  const map = new maptilersdk.Map({
    container: 'map', // container's id or the HTML element to render the map
    style: 'jp-mierune-gray',
    geolocate: maptilersdk.GeolocationType.COUNTRY,
    scrollZoom: false,
    // maxBounds: bounds,
    // center: [16.62662018, 49.2125578], // starting position [lng, lat]
    // zoom: 14, // starting zoom
    // interactive: false, // interact with the map
  });

  // NOTE: Need to work on map being bounded to where pointers are for maptilersdk
  // const bounds = new maptilersdk.Bounds();

  locations.forEach((location) => {
    // Create marker
    const el = document.createElement('div');
    el.className = 'marker';

    // Add marker
    new maptilersdk.Marker({
      element: el,
      anchor: 'bottom', // The bottom of the element, so in this case the bottom of that pin, which is going to be located at the exact GPS location
    })
      .setLngLat(location.coordinates)
      .setPopup(
        new maptilersdk.Popup({ offset: 30 }).setHTML(
          `<p>Day ${location.day}: ${location.description}</p>`,
        ),
      )
      .addTo(map);

    map.fitBounds(bounds);
    // Extend map bounds to include current location
    // bounds.extend(location.coordinates);
  });

  // map.fitBounds(bounds);

  // locations.forEach((loc) => {
  //   // Create marker
  //   const el = document.createElement('div');
  //   el.className = 'marker';

  //   // Add marker
  //   new maptilersdk.Marker({
  //     element: el,
  //     anchor: 'bottom',
  //   })
  //     .setLngLat(loc.coordinates)
  //     .addTo(map);

  //   // Add popup
  //   new mapboxgl.Popup({
  //     offset: 30,
  //   })
  //     .setLngLat(loc.coordinates)
  //     .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
  //     .addTo(map);

  //   // Extend map bounds to include current location
  //   bounds.extend(loc.coordinates);
  // });

  // locations.forEach((location) => {
  //   const marker = new maptilersdk.Marker({
  //     // color: '#FFFFFF',
  //     // draggable: true,
  //   })
  //     .setLngLat(location.coordinates)
  //     .addTo(map);
  // });
};
