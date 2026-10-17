export const liveStyles = `
  :host { display:block; min-width:0; font-family:Inter,'Avenir Next',system-ui,sans-serif; }
  * { box-sizing:border-box; } ha-card { display:block; padding:26px; border-radius:24px; background:var(--mb-surface); color:var(--mb-ink); border:1px solid var(--mb-line); box-shadow:none; }
  h2 { margin:0; font-size:17px; letter-spacing:-.4px; font-weight:650; } p { margin:6px 0; }
  .section-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:22px; } .eyebrow { font-size:10px; font-weight:650; letter-spacing:2px; text-transform:uppercase; color:var(--mb-muted); }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:14px; }
  button { min-width:0; text-align:start; font:inherit; color:inherit; border:0; background:transparent; cursor:pointer; }
  button:disabled { opacity:.5; cursor:default; } button:focus-visible,a:focus-visible { outline:2px solid var(--mb-accent); outline-offset:4px; }
  strong,small { display:block; } small { color:var(--mb-muted); font-size:11px; line-height:1.6; margin-top:5px; }
  svg { flex-shrink:0; } .icon-disc { display:inline-flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:13px; background:var(--mb-soft); color:var(--mb-accent); }
  .room-tile { padding:18px; border:1px solid var(--mb-line); border-radius:20px; min-width:0; } .room-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; }
  .room-link { color:var(--mb-muted); } .room-link svg { width:17px; } .climate-button { padding:0; width:100%; } .climate-button strong { font-size:12px; font-weight:550; color:var(--mb-muted); }
  .value { font-size:34px; letter-spacing:-1.5px; font-weight:500; margin-top:10px; line-height:1.3; } .room-tile.lit .icon-disc { background:var(--mb-active); }
  .warning { display:flex; gap:12px; align-items:center; padding:12px 0; width:100%; border-bottom:1px solid var(--mb-line); } .warning:last-child { border:0; } .warning .icon-disc { color:#b67545; } .warning strong { overflow-wrap:anywhere; font-size:12px; font-weight:600; }
  .healthy { display:flex; align-items:center; gap:12px; color:var(--mb-accent); font-size:13px; line-height:1.7; padding:8px 0; }
  ha-card.compact { height:100%; padding:14px; }
  .hero.compact .overview-grid { min-height:0; padding:0; gap:18px; align-items:center; }
  .hero.compact .overview-grid h1 { font-size:22px; margin:0 0 6px; }
  .hero.compact .overview-grid h2 { margin:0 0 8px; font-size:14px; }
  .hero.compact .overview-date { font-size:10px; }
  .hero.compact .event { margin-top:8px; padding-top:8px; }
  .room-board.compact .section-head { margin-bottom:8px; }
  .room-board.compact .grid { gap:8px; }
  .room-board.compact:not([data-theme=calm]) .room-tile { min-height:0; padding:10px; border-radius:18px; }
  .room-board.compact:not([data-theme=calm]) .room-top { top:8px; right:7px; gap:5px; }
  .room-board.compact:not([data-theme=calm]) .room-link,.room-board.compact:not([data-theme=calm]) .circle-toggle { width:27px; height:27px; }
  .room-board.compact:not([data-theme=calm]) .value { font-size:20px; margin-top:5px; }
  .room-board.compact:not([data-theme=calm]) .room-art { display:none; }
  .room-board.compact .climate-button small { margin-top:3px; }
  .room-board.compact .status-value { min-height:24px; font-size:12px; }
  .compact .warning { padding:5px 0; }
  .compact .warning .icon-disc { width:30px; height:30px; }
  .compact .people { padding:5px 0; gap:8px; }
  .compact .avatar { width:32px; height:32px; }
  .compact .robot { padding:2px 0 8px; gap:10px; }
  .compact .robot .icon-disc { width:38px; height:38px; }
  .compact .link { padding-top:8px; }
  ha-card.dashboard-summary,ha-card.dashboard-summary:not([data-theme=calm]) { height:auto; padding:0; border:0; background:transparent; box-shadow:none; backdrop-filter:none; }
  .summary-link { min-height:64px; display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:10px; padding:10px 12px; color:var(--mb-ink); background:var(--mb-surface); border:1px solid var(--mb-line); border-radius:16px; text-decoration:none; }
  .summary-icon { width:32px; height:32px; display:grid; place-items:center; color:var(--mb-accent); background:var(--mb-active); border-radius:10px; }
  .summary-icon svg { width:19px; height:19px; }
  .summary-copy { min-width:0; } .summary-copy strong { font-size:13px; line-height:1.4; }
  .summary-copy .summary-detail { display:flex; flex-wrap:wrap; column-gap:10px; margin-top:2px; font-size:10px; line-height:1.5; }
  .summary-detail > span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .summary-meta { color:var(--mb-accent); font-weight:650; }
  .summary-link > svg { color:var(--mb-accent); }
  .hero { padding:32px; background:var(--mb-hero); overflow:hidden; position:relative; border:0; }
  .hero:after { content:''; position:absolute; width:330px; height:330px; border:1px solid var(--mb-accent); opacity:.1; border-radius:50%; right:90px; top:-170px; box-shadow:0 0 0 50px var(--mb-hero),0 0 0 51px var(--mb-accent); pointer-events:none; }
  .header { display:flex; align-items:center; justify-content:space-between; gap:24px; position:relative; z-index:1; }
  h1 { margin:12px 0; font-size:clamp(30px,3.3vw,48px); letter-spacing:-2px; line-height:1.15; font-weight:550; }
  .hero-copy { color:var(--mb-muted); font-size:12px; } .clock { font-size:52px; font-weight:400; letter-spacing:-3px; font-variant-numeric:tabular-nums; line-height:1.2; }
  .clock-wrap { text-align:right; } .weather { display:inline-flex; align-items:center; gap:8px; font-size:13px; color:var(--mb-accent); margin-top:12px; }
  .event { display:flex; align-items:center; gap:12px; border-top:1px solid var(--mb-line); margin-top:25px; padding-top:18px; font-size:12px; } .event small { margin:0; }
  .people { display:flex; gap:13px; align-items:center; padding:12px 0; } .avatar { width:42px; height:42px; border-radius:50%; display:grid; place-items:center; background:var(--mb-soft); font-size:13px; font-weight:600; color:var(--mb-accent); } .people strong { font-size:13px; } .people small { margin:2px 0 0; }
  .person-state { margin-left:auto; font-size:10px; color:var(--mb-muted); } .person-state.home { background:var(--mb-active); color:var(--mb-accent); padding:6px 9px; border-radius:8px; }
  .device { padding:16px; border:1px solid var(--mb-line); border-radius:18px; display:flex; flex-direction:column; gap:15px; } .device.is-on { background:var(--mb-soft); border-color:transparent; }
  .device-top { display:flex; justify-content:space-between; align-items:center; } .device-label { padding:0; width:100%; } .device strong { font-size:12px; line-height:1.5; overflow-wrap:anywhere; }
  .switch { width:36px; height:22px; padding:3px; background:var(--mb-line); border-radius:20px; } .switch:after { content:''; display:block; width:16px; height:16px; border-radius:50%; background:var(--mb-surface); transition:transform .15s; }
  .switch[aria-checked=true] { background:var(--mb-accent); } .switch[aria-checked=true]:after { transform:translateX(14px); }
  .robot { display:flex; align-items:center; gap:16px; padding:8px 0 18px; } .robot .icon-disc { width:62px; height:62px; border-radius:50%; } .robot strong { font-size:13px; line-height:1.5; }
  .link { display:flex; align-items:center; justify-content:space-between; padding-top:15px; border-top:1px solid var(--mb-line); font-size:12px; color:var(--mb-accent); text-decoration:none; }
  .floor-map { display:block; width:min(100%,calc((100dvh - 250px) * var(--mb-map-ratio,1))); height:auto; max-height:calc(100dvh - 250px); margin:12px auto 0; } .floor-map text { fill:var(--mb-ink); pointer-events:none; font-size:15px; }
  .floor-map polygon { stroke:var(--mb-line); stroke-width:4; stroke-linejoin:round; fill:var(--mb-soft); vector-effect:non-scaling-stroke; } .floor-map .lit { fill:var(--mb-active); } .floor-map .offline { stroke:#b67545; stroke-dasharray:6; }
  .floor-map a { cursor:pointer; } .floor-map a:focus-visible polygon { stroke:var(--mb-accent); stroke-width:7; }
  .floor-map .map-marker { fill:var(--mb-surface); stroke:var(--mb-line); stroke-width:2; vector-effect:non-scaling-stroke; transition:fill .15s,stroke .15s; }
  .floor-map .map-marker.active { fill:var(--mb-active); stroke:var(--mb-accent); } .floor-map .map-marker.unavailable { stroke:#b67545; stroke-dasharray:3; }
  .floor-map .map-marker-icon { fill:none; stroke:var(--mb-accent); stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; pointer-events:none; }
  .floor-map a[data-marker]:hover .map-marker,.floor-map a[data-marker]:focus-visible .map-marker { stroke:var(--mb-accent); stroke-width:3; }
  .floor-map .floor-wall { fill:none; stroke:var(--mb-ink); stroke-width:8; stroke-linecap:square; stroke-linejoin:miter; opacity:.65; vector-effect:non-scaling-stroke; pointer-events:none; }
  .interactive-plan { --mb-map-floor:#f8f4e8; --mb-map-furniture:#c9d1be; --mb-map-cushion:#e5e8dc; --mb-map-wood:#d6c59d; --mb-map-water:#b7d3d5; --mb-map-light:#edcf83; --mb-map-radiator:#dfc19a; }
  .interactive-plan.night { --mb-map-floor:#25352f; --mb-map-furniture:#516455; --mb-map-cushion:#738471; --mb-map-wood:#827454; --mb-map-water:#56828a; --mb-map-light:#bd9951; --mb-map-radiator:#967c59; }
  .map-toolbar { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .map-toolbar select { flex:1; min-width:100px; max-width:300px; min-height:44px; font:inherit; font-size:13px; border:1px solid var(--mb-line); border-radius:12px; padding:8px; background:var(--mb-surface); color:var(--mb-ink); }
  .map-toolbar button,.map-device-detail button { min-width:44px; min-height:44px; padding:8px 12px; border:1px solid var(--mb-line); border-radius:12px; background:var(--mb-soft); }
  .map-viewport { overflow:hidden; height:max(240px,calc(100dvh - 290px)); touch-action:none; cursor:grab; }
  .map-viewport:active { cursor:grabbing; }
  .furnished-map { width:min(100%,calc(max(150px,100dvh - 330px) * var(--mb-map-ratio,1))); height:auto; max-height:max(150px,calc(100dvh - 330px)); min-height:0; margin:12px auto; aspect-ratio:var(--mb-map-ratio); }
  .furnished-map polygon { fill:var(--mb-map-floor); stroke:var(--mb-accent); stroke-width:2; vector-effect:none; }
  .furnished-map polygon.lit { fill:var(--mb-map-floor); }
  .furnished-map .map-drawing { fill:none; stroke:var(--mb-accent); stroke-width:1.5; stroke-linejoin:round; }
  .furnished-map .map-room-label rect { fill:var(--mb-map-floor); opacity:.94; }
  .furnished-map .map-room-label .room-name { font-size:13px; font-weight:600; }
  .furnished-map .map-room-label .room-value { font-size:12px; }
  .furnished-map .map-marker { stroke-width:1.5; vector-effect:none; }
  .furnished-map .map-marker.wall-switched { fill:var(--mb-soft); stroke:var(--mb-muted); stroke-dasharray:2 3; }
  .map-device-detail { padding:12px; margin-top:12px; border:1px solid var(--mb-line); border-radius:12px; font-size:13px; }
  .map-device-detail button { margin:10px 8px 0 0; }
  .map-device-list { margin-top:12px; font-size:13px; }
  .map-device-list summary { cursor:pointer; min-height:44px; padding:12px 0; }
  .map-device-list > button { display:flex; align-items:center; justify-content:space-between; gap:12px; width:100%; min-height:44px; padding:10px 4px; border-bottom:1px solid var(--mb-line); }
  .entity-id { font-family:ui-monospace,monospace; font-size:10px; overflow-wrap:anywhere; opacity:.8; }
  .room-board .value.status-value { display:flex; align-items:center; min-height:32px; font-size:12px; letter-spacing:0; line-height:1.6; }
  .room-board .value.status-value svg { width:27px; height:27px; color:#a75f49; }
  .room-board .climate-button small svg { width:15px; height:15px; vertical-align:middle; color:#a75f49; }
  .room-name { font-size:18px; font-weight:600; } .room-value { font-size:17px; } .message { color:var(--mb-muted); line-height:1.7; font-size:13px; }
  @media(max-width:700px) { ha-card { padding:20px; } .hero { padding:26px 22px; } .header { align-items:start; flex-wrap:wrap; } .clock { font-size:42px; } .clock-wrap { text-align:left; } h1 { font-size:34px; } .grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; } .room-tile { padding:14px; } .value { font-size:28px; } .device { padding:14px; } }
  ha-card:not([data-theme=calm]) { backdrop-filter:blur(18px); box-shadow:0 12px 32px #0000000d; }
  .hero:not([data-theme=calm]),.room-board:not([data-theme=calm]) { padding:0; background:transparent; border:0; box-shadow:none; backdrop-filter:none; }
  .hero:not([data-theme=calm]) { overflow:visible; border-radius:0; }
  .hero:not([data-theme=calm]):after { display:none; }
  .overview-grid { display:grid; grid-template-columns:1.1fr 1fr 1fr; gap:42px; min-height:225px; padding:8px 0 22px; }
  .overview-welcome { min-width:0; padding:4px 8px; text-align:center; }
  .overview-welcome .weather-chips { justify-content:center; }
  .overview-grid h1 { font-size:24px; font-weight:400; letter-spacing:-.35px; line-height:1.3; overflow-wrap:anywhere; margin:0 0 12px; }
  .overview-grid h2 { font-size:17px; font-weight:550; margin-bottom:20px; }
  .overview-date { color:var(--mb-muted); font-size:12px; line-height:1.7; }
  .weather-chips { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-top:20px; }
  .chip { display:inline-flex; gap:7px; align-items:center; padding:8px 11px; border-radius:20px; background:var(--mb-active); color:var(--mb-ink); font-size:11px; }
  .chip svg { width:16px; height:16px; } .reading { display:flex; gap:12px; align-items:center; padding:20px 0; }
  .reading strong { font-size:42px; font-weight:450; letter-spacing:-2px; } .reading small { font-size:11px; }
  .climate-pills { display:flex; gap:10px; } .climate-pills .chip { background:var(--mb-soft); }
  .calendar-entry { display:flex; align-items:center; gap:15px; margin:14px 0; font-size:12px; padding:10px 0; }
  .calendar-date { border-right:3px solid var(--mb-accent); padding-right:12px; min-width:45px; font-size:26px; font-weight:500; letter-spacing:-1px; } .calendar-entry strong { font-size:12px; line-height:1.5; }
  .room-board:not([data-theme=calm]) .grid { grid-template-columns:repeat(auto-fit,minmax(155px,1fr)); gap:12px; }
  .room-board:not([data-theme=calm]) .room-tile { position:relative; min-height:205px; padding:17px; background:#adc9d3; color:#1e3034; border:0; border-radius:27px; overflow:hidden; box-shadow:0 8px 22px #00000013; }
  .room-board:not([data-theme=calm]) .room-tile:nth-child(4n+2) { background:#b6cbc3; }
  .room-board:not([data-theme=calm]) .room-tile:nth-child(4n+3) { background:#c5c0d9; }
  .room-board:not([data-theme=calm]) .room-tile:nth-child(4n) { background:#d5c6a9; }
  .room-board[data-theme=storybook] .room-tile { background:#b8cbbb; } .room-board[data-theme=storybook] .room-tile:nth-child(4n+2) { background:#e0c999; } .room-board[data-theme=storybook] .room-tile:nth-child(4n+3) { background:#bbcfd4; } .room-board[data-theme=storybook] .room-tile:nth-child(4n) { background:#d6bbb0; }
  .room-board:not([data-theme=calm]) .room-top { margin-bottom:0; position:absolute; top:15px; right:12px; flex-direction:column; gap:8px; z-index:2; }
  .room-board:not([data-theme=calm]) .icon-disc { display:none; }
  .room-board:not([data-theme=calm]) .room-link,.circle-toggle { width:32px; height:32px; display:grid; place-items:center; padding:0; border-radius:50%; background:#26343c; color:#e8eef0; }
  .circle-toggle svg { width:17px; height:17px; } .circle-toggle[aria-checked=true] { background:#f1d787; color:#524d32; }
  .room-board:not([data-theme=calm]) .climate-button { position:relative; padding-right:30px; z-index:1; }
  .room-board:not([data-theme=calm]) .climate-button strong { color:#24383a; font-weight:650; font-size:12px; }
  .room-board:not([data-theme=calm]) .value { font-size:26px; margin-top:8px; letter-spacing:-1px; }
  .room-board:not([data-theme=calm]) .climate-button small { color:#33494b; font-size:10px; line-height:1.5; }
  .room-art { position:absolute; bottom:18px; left:18px; color:#516965; z-index:0; } .room-art:before { content:''; position:absolute; width:105px; height:105px; background:#f5edc22e; border-radius:50%; top:-22px; left:-26px; }
  .room-art svg { position:relative; width:70px; height:70px; stroke-width:1.6; } .lit .room-art { color:#f6df94; }
  [data-theme=calm] .room-art,[data-theme=calm] .circle-toggle { display:none; }
  @media(max-width:900px) { .overview-grid { grid-template-columns:1fr 1fr; gap:26px; } .agenda { grid-column:1/-1; display:flex; align-items:start; gap:20px; flex-wrap:wrap; } .agenda h2 { margin:10px 0; } .calendar-entry { margin:0; } }
  @media(max-width:600px) { .overview-grid { grid-template-columns:1fr; gap:20px; } .agenda { display:block; } .overview-grid h1 { font-size:22px; } .overview-grid h2 { margin-bottom:12px; } .reading { padding:8px 0; } .room-board:not([data-theme=calm]) .grid { grid-template-columns:repeat(2,minmax(0,1fr)); } .room-board:not([data-theme=calm]) .room-tile { min-height:220px; padding:15px; } .room-board:not([data-theme=calm]) .climate-button { padding-right:22px; } .room-board:not([data-theme=calm]) .room-top { right:8px; } .room-art svg { width:64px; height:64px; } }
  @media(prefers-reduced-motion:reduce) { .switch:after { transition:none; } }
  .interactive-plan .furnished-map { width:100%; height:100%; max-height:none; margin:0; aspect-ratio:auto; transform-origin:center; user-select:none; }
  :host:has(.map-only) { height:100%; }
  ha-card.map-only { height:100%; min-height:0; padding:0; position:relative; overflow:hidden; }
  .map-only .map-viewport { height:100%; padding:66px 12px 60px; }
  .map-only .map-toolbar { position:absolute; inset:10px 10px auto; z-index:2; flex-wrap:nowrap; pointer-events:none; }
  .map-only .map-toolbar > * { pointer-events:auto; }
  .map-back { display:inline-flex; align-items:center; min-height:44px; padding:8px 12px; border:1px solid var(--mb-line); border-radius:12px; background:var(--mb-surface); color:var(--mb-ink); text-decoration:none; font-size:13px; white-space:nowrap; }
  .map-only .map-toolbar select { width:0; max-width:220px; }
  .map-only .map-device-list { position:absolute; bottom:10px; left:12px; z-index:2; margin:0; padding:0 12px; width:min(340px,calc(100% - 24px)); max-height:45%; overflow:auto; border:1px solid var(--mb-line); border-radius:12px; background:var(--mb-surface); }
  .map-only .map-device-detail { position:absolute; bottom:10px; right:12px; z-index:3; width:min(340px,calc(100% - 24px)); max-height:45%; overflow:auto; background:var(--mb-surface); }
  .map-only.has-device-detail .map-device-list { display:none; }
  ha-card.climate-board { padding:0; background:transparent; border:0; }
  .climate-board .section-head { margin-bottom:10px; }
  .climate-table { width:100%; table-layout:fixed; border-collapse:separate; border-spacing:0 8px; }
  .climate-table th,.climate-table td { padding:0; text-align:start; }
  .climate-table thead th { padding:6px 16px; color:var(--mb-muted); font-size:13px; font-weight:550; overflow-wrap:anywhere; hyphens:auto; }
  .climate-table th:first-child { width:34%; }
  .climate-table tbody th,.climate-table td { background:var(--mb-surface); border-block:1px solid var(--mb-line); }
  .climate-table tbody th { border-left:1px solid var(--mb-line); border-radius:16px 0 0 16px; }
  .climate-table td:last-child { border-right:1px solid var(--mb-line); border-radius:0 16px 16px 0; }
  .climate-room,.climate-reading,.climate-empty { display:flex; align-items:center; width:100%; min-height:68px; padding:12px 16px; }
  .climate-room { font-size:16px; font-weight:600; color:var(--mb-ink); text-decoration:none; overflow-wrap:anywhere; }
  .climate-reading { font-size:clamp(17px,2.6vw,28px); font-variant-numeric:tabular-nums; white-space:nowrap; border-radius:12px; }
  .climate-room:hover,.climate-reading:hover { background:var(--mb-soft); }
  .climate-reading svg { width:24px; height:24px; color:var(--mb-muted); }
  .climate-empty { color:var(--mb-muted); }
  .people-board,.system-board { min-height:var(--mb-detail-height,0); }
  .people-board { display:flex; flex-direction:column; }
  .people-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr)); gap:18px; flex:1; }
  .people-board .people { flex-direction:column; justify-content:center; gap:16px; min-height:240px; padding:28px 18px; text-align:center; border:1px solid var(--mb-line); background:var(--mb-soft); border-radius:20px; }
  .people-board .avatar { width:76px; height:76px; font-size:26px; }
  .people-board .people strong { font-size:22px; overflow-wrap:anywhere; }
  .people-board .person-state { margin:0; font-size:15px; }
  .system-summary { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-bottom:24px; }
  .system-stat { padding:22px 14px; background:var(--mb-soft); border:1px solid var(--mb-line); border-radius:18px; }
  .system-stat strong { font-size:clamp(26px,4vw,48px); font-weight:500; margin-bottom:8px; }
  .system-stat span { font-size:12px; color:var(--mb-muted); overflow-wrap:anywhere; }
  .warnings-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr)); gap:12px; }
  .system-board .warning { padding:18px; border:1px solid var(--mb-line); border-radius:16px; background:var(--mb-soft); }
  .system-board .healthy { min-height:140px; justify-content:center; text-align:center; font-size:18px; }
  @media(max-width:600px) {
    .climate-table thead th { padding:6px 8px; font-size:11px; }
    .climate-room,.climate-reading,.climate-empty { min-height:60px; padding:10px 8px; }
    .climate-room { font-size:13px; }
    .has-dew-point .climate-reading { font-size:15px; padding-inline:6px; }
    .map-only .map-toolbar { gap:4px; }
    .map-only .map-toolbar select { min-width:75px; }
    .map-back { padding:8px; font-size:11px; }
  }
`;
