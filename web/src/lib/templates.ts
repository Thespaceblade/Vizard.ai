export const GLOBE_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Vizard.ai — Interactive Globe</title>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <script src="https://d3js.org/topojson.v3.min.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: #ffffff; color: #334155; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
    h2 { font-size: 20px; font-weight: 700; margin-bottom: 24px; color: #1e3a5f; text-align: center; }
    #globe-container { cursor: grab; position: relative; }
    #globe-container:active { cursor: grabbing; }
    .sphere { fill: #e0f2fe; }
    .land { fill: #f1f5f9; stroke: #cbd5e1; stroke-width: 0.5px; transition: fill 0.2s; }
    .land:hover { fill: #e2e8f0; }
    .graticule { fill: none; stroke: #bae6fd; stroke-width: 0.5px; opacity: 0.5; }
    .tooltip { position: absolute; background: rgba(30, 41, 59, 0.9); color: white; padding: 8px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; pointer-events: none; opacity: 0; transition: opacity 0.2s; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); z-index: 10; max-width: 250px; }
  </style>
</head>
<body>
  <div id="header-container"></div>
  <div id="globe-container"></div>
  <div class="tooltip" id="tooltip"></div>

  <script>
    /*
      ===============================================================
      VIZARD.AI PRE-BUILT GLOBE TEMPLATE
      Core interactivity (drag rotation, zooming, rendering) is pre-written.
      Your task as the LLM is to inject the data and customize the visual markers!
      ===============================================================
    */
    
    // --- 1. LLM INJECTS DATA HERE ---
    // Example: const csvText = \`Country,Value\\nUSA,100\\nFRA,50\`;
    const csvText = \`\`; 
    // const data = d3.csvParse(csvText);
    
    // --- 2. CORE SETUP ---
    const width = Math.min(window.innerWidth - 40, 800);
    const height = Math.min(window.innerHeight - 100, 600);
    const radius = Math.min(width, height) / 2 - 20;

    const svg = d3.select("#globe-container").append("svg")
      .attr("width", width)
      .attr("height", height);

    const projection = d3.geoOrthographic()
      .scale(radius)
      .center([0, 0])
      .translate([width / 2, height / 2])
      .clipAngle(90)
      .precision(0.1);

    const path = d3.geoPath().projection(projection);

    // Render layers
    const gBackground = svg.append("g");
    const gMap = svg.append("g");
    const gMarkers = svg.append("g"); // LLM should draw data points here!

    gBackground.append("path")
      .datum({ type: "Sphere" })
      .attr("class", "sphere")
      .attr("d", path);

    const graticule = d3.geoGraticule10();
    gBackground.append("path")
      .datum(graticule)
      .attr("class", "graticule")
      .attr("d", path);

    // --- 3. DRAG INTERACTIVITY (DO NOT MODIFY IF POSSIBLE) ---
    const drag = d3.drag()
      .on("start", () => d3.select("#globe-container").style("cursor", "grabbing"))
      .on("drag", (event) => {
        const rotate = projection.rotate();
        const k = 75 / projection.scale();
        projection.rotate([
          rotate[0] + event.dx * k,
          rotate[1] - event.dy * k
        ]);
        updatePaths();
      })
      .on("end", () => d3.select("#globe-container").style("cursor", "grab"));
    
    svg.call(drag);

    // --- 4. ZOOM INTERACTIVITY (DO NOT MODIFY IF POSSIBLE) ---
    const zoom = d3.zoom()
        .scaleExtent([0.5, 4])
        .on("zoom", (event) => {
            projection.scale(radius * event.transform.k);
            updatePaths();
        });
    svg.call(zoom);

    // --- 5. RENDER LOOP ---
    function updatePaths() {
      gBackground.selectAll("path.sphere, path.graticule").attr("d", path);
      gMap.selectAll("path.land").attr("d", path);
      
      // LLM: You must update your markers here so they stick to the globe!
      // Example:
      // gMarkers.selectAll("circle.data-point")
      //   .attr("cx", d => {
      //      const p = projection([d.longitude, d.latitude]);
      //      return p ? p[0] : -9999;
      //   })
      //   .attr("cy", d => {
      //      const p = projection([d.longitude, d.latitude]);
      //      return p ? p[1] : -9999;
      //   })
      //   .style("display", d => {
      //      const p = projection([d.longitude, d.latitude]);
      //      if (!p) return "none";
      //      // Hide points on the back of the globe computing distance from center
      //      const center = projection.invert([width/2, height/2]);
      //      if (!center) return "none";
      //      const dist = d3.geoDistance(center, [d.longitude, d.latitude]);
      //      return dist > Math.PI / 2 ? "none" : "block";
      //   });
    }

    // --- 6. LOAD MAP DATA ---
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json").then((worldData) => {
      const countries = topojson.feature(worldData, worldData.objects.countries).features;
      
      gMap.selectAll("path.land")
        .data(countries)
        .enter().append("path")
        .attr("class", "land")
        .attr("d", path);

      // --- 7. LLM CUSTOMIZATION ---
      // LLM: Add your title text, data processing, and marker drawing logic here!
      // Remember to call updatePaths() if you draw geolocated markers.
      
      d3.select("#header-container").html("<h2>[LLM: INJECT TITLE HERE]</h2>");
      
    });

  </script>
</body>
</html>`;

export const BAR_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Vizard.ai — Interactive Bar Chart</title>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: #ffffff; color: #334155; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; overflow: hidden; padding: 24px; }
    #header-container { width: 100%; max-width: 800px; margin-bottom: 16px; text-align: center; }
    h2 { font-size: 20px; font-weight: 700; color: #1e3a5f; }
    #chart-container { width: 100%; max-width: 800px; height: 100%; max-height: 500px; position: relative; }
    .bar { fill: #0d9488; rx: 4; cursor: pointer; transition: opacity 0.2s; }
    .bar:hover { fill: #1e3a5f; }
    .axis text { font-size: 11px; fill: #64748b; font-family: 'Inter', sans-serif;}
    .axis line, .axis path { stroke: #e2e8f0; }
    .grid line { stroke: #f1f5f9; stroke-width: 1px; stroke-dasharray: 4; }
    .grid path { stroke-width: 0; }
    .tooltip { position: absolute; background: rgba(30, 41, 59, 0.9); color: white; padding: 8px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; pointer-events: none; opacity: 0; transition: opacity 0.2s; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); z-index: 10; max-width: 250px; }
  </style>
</head>
<body>
  <div id="header-container"></div>
  <div id="chart-container"></div>
  <div class="tooltip" id="tooltip"></div>

  <script>
    /*
      ===============================================================
      VIZARD.AI PRE-BUILT BAR CHART TEMPLATE
      Core axes, grid lines, and sizing logic are included.
      Your task as the LLM is to inject the data, set scales, and draw bars!
      ===============================================================
    */
    
    // --- 1. LLM INJECTS DATA HERE ---
    const csvText = \`\`; 
    // const raw = d3.csvParse(csvText);

    // --- 2. CORE SETUP ---
    const container = document.getElementById('chart-container');
    const margin = { top: 20, right: 20, bottom: 80, left: 60 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight - margin.top - margin.bottom;

    const svg = d3.select("#chart-container").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", \`translate(\${margin.left},\${margin.top})\`);

    const tooltip = d3.select("#tooltip");

    // --- 3. LLM CUSTOMIZATION ---
    // LLM: Add your title text, data processing, scales, axes, and bar drawing logic here!
    d3.select("#header-container").html("<h2>[LLM: INJECT TITLE HERE]</h2>");
    
    /* Example:
       const x = d3.scaleBand().range([0, width]).padding(0.2);
       const y = d3.scaleLinear().range([height, 0]);
       
       svg.append("g").attr("class", "grid").call(d3.axisLeft(y).tickSize(-width).tickFormat(""));
       // draw axes...
       // draw bars with entrance transition...
    */
  </script>
</body>
</html>`;

export const SCATTER_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Vizard.ai — Interactive Scatter Plot</title>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: #ffffff; color: #334155; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; overflow: hidden; padding: 24px; }
    #header-container { width: 100%; max-width: 800px; margin-bottom: 16px; text-align: center; }
    h2 { font-size: 20px; font-weight: 700; color: #1e3a5f; }
    #chart-container { width: 100%; max-width: 800px; height: 100%; max-height: 500px; position: relative; }
    .dot { fill: #c2410c; opacity: 0.7; stroke: white; stroke-width: 1px; cursor: crosshair; transition: stroke-width 0.1s, opacity 0.1s; }
    .dot:hover { opacity: 1; stroke: #1e3a5f; stroke-width: 2px; }
    .axis text { font-size: 11px; fill: #64748b; font-family: 'Inter', sans-serif;}
    .axis line, .axis path { stroke: #e2e8f0; }
    .grid line { stroke: #f1f5f9; stroke-width: 1px; stroke-dasharray: 4; }
    .grid path { stroke-width: 0; }
    .tooltip { position: absolute; background: rgba(30, 41, 59, 0.9); color: white; padding: 8px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; pointer-events: none; opacity: 0; transition: opacity 0.2s; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); z-index: 10; max-width: 250px; }
    .zoom-rect { fill: none; pointer-events: all; }
  </style>
</head>
<body>
  <div id="header-container"></div>
  <div id="chart-container"></div>
  <div class="tooltip" id="tooltip"></div>

  <script>
    /*
      ===============================================================
      VIZARD.AI PRE-BUILT SCATTER TEMPLATE
      Includes zoom/pan boilerplate for scatter plots.
      Your task as the LLM is to inject the data, set scales, and draw dots!
      ===============================================================
    */
    
    const csvText = \`\`; 
    
    const container = document.getElementById('chart-container');
    const margin = { top: 20, right: 20, bottom: 60, left: 60 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight - margin.top - margin.bottom;

    const svg = d3.select("#chart-container").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", \`translate(\${margin.left},\${margin.top})\`);

    // Zoom setup (LLM: attach to this if configuring x/y domains dynamically)
    const zoomRect = svg.append("rect")
        .attr("class", "zoom-rect")
        .attr("width", width)
        .attr("height", height);

    const gGrid = svg.append("g").attr("class", "grid");
    const gX = svg.append("g").attr("class", "axis").attr("transform", \`translate(0,\${height})\`);
    const gY = svg.append("g").attr("class", "axis");
    const gDots = svg.append("g").attr("clip-path", "url(#clip)");
    
    svg.append("defs").append("clipPath")
      .attr("id", "clip")
      .append("rect")
      .attr("width", width)
      .attr("height", height);

    const tooltip = d3.select("#tooltip");

    d3.select("#header-container").html("<h2>[LLM: INJECT TITLE HERE]</h2>");
    
    // LLM: IMPLEMENT ZOOM HANDLER IF YOU DEFINE SCALES
    // const zoom = d3.zoom().scaleExtent([0.5, 10]).on("zoom", (e) => {
    //    const newX = e.transform.rescaleX(xScale);
    //    const newY = e.transform.rescaleY(yScale);
    //    gX.call(d3.axisBottom(newX));
    //    gY.call(d3.axisLeft(newY));
    //    gDots.selectAll(".dot").attr("cx", d => newX(d.x)).attr("cy", d => newY(d.y));
    // });
    // zoomRect.call(zoom);

  </script>
</body>
</html>`;

export const LINE_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Vizard.ai — Interactive Line Chart</title>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: #ffffff; color: #334155; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; overflow: hidden; padding: 24px; }
    #header-container { width: 100%; max-width: 800px; margin-bottom: 16px; text-align: center; }
    h2 { font-size: 20px; font-weight: 700; color: #1e3a5f; }
    #chart-container { width: 100%; max-width: 800px; height: 100%; max-height: 500px; position: relative; }
    .line { fill: none; stroke: #1d4ed8; stroke-width: 2.5px; stroke-linejoin: round; stroke-linecap: round; }
    .axis text { font-size: 11px; fill: #64748b; font-family: 'Inter', sans-serif;}
    .axis line, .axis path { stroke: #e2e8f0; }
    .grid line { stroke: #f1f5f9; stroke-width: 1px; stroke-dasharray: 4; }
    .grid path { stroke-width: 0; }
    .tooltip-overlay { fill: transparent; cursor: crosshair; }
    .hover-line { stroke: #94a3b8; stroke-width: 1px; stroke-dasharray: 4; opacity: 0; pointer-events: none; }
    .hover-circle { fill: #1d4ed8; stroke: white; stroke-width: 2px; opacity: 0; pointer-events: none; }
    .tooltip { position: absolute; background: rgba(30, 41, 59, 0.9); color: white; padding: 8px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; pointer-events: none; opacity: 0; transition: opacity 0.1s; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); z-index: 10; max-width: 250px; }
  </style>
</head>
<body>
  <div id="header-container"></div>
  <div id="chart-container"></div>
  <div class="tooltip" id="tooltip"></div>

  <script>
    /*
      ===============================================================
      VIZARD.AI PRE-BUILT LINE TEMPLATE
      Includes bisector/hover overlay mechanics.
      Your task as the LLM is to inject the data, set scales, and draw the line(s)!
      ===============================================================
    */
    
    const csvText = \`\`; 
    
    const container = document.getElementById('chart-container');
    const margin = { top: 20, right: 20, bottom: 60, left: 60 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight - margin.top - margin.bottom;

    const svg = d3.select("#chart-container").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", \`translate(\${margin.left},\${margin.top})\`);

    const gGrid = svg.append("g").attr("class", "grid");
    const gX = svg.append("g").attr("class", "axis").attr("transform", \`translate(0,\${height})\`);
    const gY = svg.append("g").attr("class", "axis");
    const gLine = svg.append("g");
    
    // Interactive overlay for bisector tooltips (LLM to configure mousemove logic)
    const hoverLine = svg.append("line").attr("class", "hover-line").attr("y1", 0).attr("y2", height);
    const hoverCircle = svg.append("circle").attr("class", "hover-circle").attr("r", 5);
    const tooltipOverlay = svg.append("rect").attr("class", "tooltip-overlay").attr("width", width).attr("height", height);

    const tooltip = d3.select("#tooltip");

    d3.select("#header-container").html("<h2>[LLM: INJECT TITLE HERE]</h2>");
    
  </script>
</body>
</html>`;
