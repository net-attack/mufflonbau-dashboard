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
  .floor-map { width:100%; height:auto; max-height:65vh; margin-top:12px; } .floor-map text { fill:var(--mb-ink); pointer-events:none; }
  .floor-map rect { stroke:var(--mb-line); stroke-width:3; fill:var(--mb-soft); } .floor-map .lit { fill:var(--mb-active); } .floor-map .offline { stroke:#b67545; stroke-dasharray:6; }
  .entity-id { font-family:ui-monospace,monospace; font-size:10px; overflow-wrap:anywhere; opacity:.8; }
  .room-board .value.status-value { font-size:12px; letter-spacing:0; line-height:1.6; }
  .room-name { font-size:18px; font-weight:600; } .room-value { font-size:17px; } .message { color:var(--mb-muted); line-height:1.7; font-size:13px; }
  @media(max-width:700px) { ha-card { padding:20px; } .hero { padding:26px 22px; } .header { align-items:start; flex-wrap:wrap; } .clock { font-size:42px; } .clock-wrap { text-align:left; } h1 { font-size:34px; } .grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; } .room-tile { padding:14px; } .value { font-size:28px; } .device { padding:14px; } }
  ha-card:not([data-theme=calm]) { backdrop-filter:blur(18px); box-shadow:0 12px 32px #0000000d; }
  .hero:not([data-theme=calm]),.room-board:not([data-theme=calm]) { padding:0; background:transparent; border:0; box-shadow:none; backdrop-filter:none; }
  .hero:not([data-theme=calm]):after { display:none; }
  .overview-grid { display:grid; grid-template-columns:1.1fr 1fr 1fr; gap:42px; min-height:225px; padding:8px 0 22px; }
  .overview-grid h1 { font-size:29px; font-weight:550; letter-spacing:-1px; margin:0 0 12px; }
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
  @media(max-width:600px) { .overview-grid { grid-template-columns:1fr; gap:20px; } .agenda { display:block; } .overview-grid h1 { font-size:27px; } .overview-grid h2 { margin-bottom:12px; } .reading { padding:8px 0; } .room-board:not([data-theme=calm]) .grid { grid-template-columns:repeat(2,minmax(0,1fr)); } .room-board:not([data-theme=calm]) .room-tile { min-height:220px; padding:15px; } .room-board:not([data-theme=calm]) .climate-button { padding-right:22px; } .room-board:not([data-theme=calm]) .room-top { right:8px; } .room-art svg { width:64px; height:64px; } }
  @media(prefers-reduced-motion:reduce) { .switch:after { transition:none; } }
`;
