export const shellStyles = `
  :host { display:block; min-width:0; min-height:calc(100dvh - 56px); background:var(--mb-canvas); background-image:var(--mb-wallpaper); background-size:cover; background-position:center bottom; background-attachment:fixed; color:var(--mb-ink); font-family:Inter,'Avenir Next',system-ui,sans-serif; -webkit-font-smoothing:antialiased; }
  * { box-sizing:border-box; } .shell { display:grid; grid-template-columns:210px minmax(0,1fr); min-height:inherit; }
  aside { padding:38px 22px; border-right:1px solid var(--mb-line); display:flex; flex-direction:column; gap:48px; }
  .brand { display:flex; gap:12px; align-items:center; font-weight:750; font-size:19px; letter-spacing:-.6px; }
  .monogram { display:grid; place-items:center; width:40px; height:40px; border-radius:14px; background:var(--mb-accent); color:var(--mb-canvas); font-size:23px; }
  nav { display:flex; flex-direction:column; gap:8px; position:sticky; top:30px; }
  nav svg { flex-shrink:0; }
  a { display:flex; align-items:center; gap:13px; padding:14px 15px; color:var(--mb-muted); text-decoration:none; border-radius:14px; font-size:13px; font-weight:600; }
  a[aria-current=page] { background:var(--mb-active); color:var(--mb-accent); } a:hover { color:var(--mb-accent); background:var(--mb-soft); }
  .more-menu { display:none; }
  a:focus-visible { outline:2px solid var(--mb-accent); outline-offset:3px; }
  .footnote { margin-top:auto; padding:24px 12px 0; font-size:10px; line-height:1.7; letter-spacing:2px; color:var(--mb-muted); text-transform:uppercase; }
  main { min-width:0; padding:38px clamp(20px,3vw,52px) 48px; max-width:1560px; width:100%; margin:0 auto; }
  .topline { display:flex; justify-content:space-between; align-items:center; margin:0 0 30px; color:var(--mb-muted); font-size:10px; letter-spacing:2px; text-transform:uppercase; }
  .status { display:flex; align-items:center; gap:7px; letter-spacing:1px; } .dot { width:6px; height:6px; border-radius:50%; background:var(--mb-accent); }
  .heading { font-size:36px; letter-spacing:-1.6px; font-weight:600; margin:0 0 30px; }
  .content { display:grid; grid-template-columns:repeat(12,minmax(0,1fr)); align-items:start; gap:22px; }
  .slot { min-width:0; grid-column:span 6; } .slot.wide { grid-column:1/-1; } .slot.rooms { grid-column:span 8; } .slot.compact { grid-column:span 4; }
  .slot.devices { grid-column:span 8; } .slot ha-card { background:var(--mb-surface); }
  .slot.cleaning { grid-column:span 7; height:min(520px,calc(100dvh - 280px)); min-height:300px; }
  .slot.cleaning-map { grid-column:span 5; height:min(520px,calc(100dvh - 280px)); min-height:260px; overflow:hidden; border-radius:24px; }
  .slot.cleaning-map > * { width:100%; height:100%; }
  :host([data-view=calendar][data-full-view=true]) { height:100dvh; min-height:0; }
  :host([data-view=calendar][data-full-view=true]) .shell,:host([data-view=calendar][data-full-view=true]) main { height:100%; min-height:0; }
  :host([data-view=calendar][data-full-view=true]) main { display:flex; flex-direction:column; padding:20px clamp(18px,3vw,46px) max(90px,var(--mb-nav-space,110px)); }
  :host([data-view=calendar][data-full-view=true]) .topline { flex:none; margin-bottom:12px; }
  :host([data-view=calendar][data-full-view=true]) .heading { flex:none; margin:0 0 12px; }
  :host([data-view=calendar][data-full-view=true]) .content { flex:1; min-height:0; }
  :host([data-view=calendar][data-full-view=true]) .slot.calendar { grid-column:1/-1; min-height:0; height:100%; }
  :host([data-view=calendar][data-full-view=true]) .slot.calendar > * { height:100%; }
  :host([data-view=calendar][data-full-view=true]) { overflow:hidden; }
  @media(min-width:701px) {
    :host([data-view=home]) { height:100dvh; min-height:0; overflow:hidden; }
    :host([data-view=home]) .shell,:host([data-view=home]) main { height:100%; min-height:0; }
    :host([data-view=home]) aside { min-height:0; padding-top:22px; padding-bottom:22px; }
    :host([data-view=home]) main { display:flex; flex-direction:column; padding:20px clamp(18px,2vw,32px) 150px; }
    :host([data-view=home]) .topline { flex:none; margin-bottom:8px; }
    :host([data-view=home]) .heading { flex:none; font-size:28px; margin:0 0 12px; }
    :host([data-view=home]) .content { flex:none; min-height:0; align-items:start; align-content:start; grid-template-rows:auto auto auto; gap:12px; }
    :host([data-view=home]) .slot { min-height:0; }
    :host([data-view=home]) .slot.mode-header { grid-column:1/-1; grid-row:1; }
    :host([data-view=home]) .slot.mode-room-summary { grid-column:span 7; grid-row:2; }
    :host([data-view=home]) .slot.mode-presence-summary { grid-column:span 5; grid-row:2; }
    :host([data-view=home]) .slot.mode-cleaning { grid-column:span 7; grid-row:3; height:auto; min-height:0; max-height:none; }
    :host([data-view=home]) .slot.mode-warnings { grid-column:span 5; grid-row:3; }
    :host([data-view=home]) .slot.mode-devices { grid-column:1/-1; grid-row:3; }
    :host([data-view=home]) .slot > * { height:auto; }
    :host([data-view=home]) .room-board .grid { grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; }
    :host([data-view=home]) .room-board .room-tile { min-height:0; height:100%; padding:12px; }
    :host([data-view=home]) .room-board .climate-button { padding-right:26px; }
    :host([data-view=home]) .room-board .room-art { bottom:8px; left:12px; }
    :host([data-view=home]) .room-board .room-art svg { width:48px; height:48px; }
    :host([data-view=home]) .slot.mode-header ha-card { padding:18px 24px; }
  }
  @media(min-width:701px) and (max-width:1100px) {
    :host([data-view=home]) { height:auto; min-height:100dvh; overflow:visible; }
    :host([data-view=home]) .shell,:host([data-view=home]) main { height:auto; min-height:100dvh; }
    :host([data-view=home]) main { padding-bottom:112px; }
    :host([data-view=home]) .content { flex:none; align-items:start; align-content:start; gap:14px; }
    :host([data-view=home]) .slot { width:100%; min-height:0; }
    :host([data-view=home]) .slot.mode-header { min-height:0; }
    :host([data-view=home]) .slot.mode-room-summary,:host([data-view=home]) .slot.mode-presence-summary { min-height:0; }
    :host([data-view=home]) .slot.mode-cleaning { height:auto; min-height:0; max-height:none; }
    :host([data-view=home]) .slot > * { height:auto; }
  }
  :host([data-view=cleaning]) { min-height:100dvh; }
  :host([data-view=cleaning]) .shell { min-height:100dvh; }
  :host([data-view=cleaning]) main { min-height:100dvh; padding:18px clamp(18px,3vw,46px) 128px; display:flex; flex-direction:column; }
  :host([data-view=cleaning]) .topline { flex:none; margin-bottom:8px; }
  :host([data-view=cleaning]) .heading { flex:none; font-size:28px; margin:0 0 10px; }
  :host([data-view=cleaning]) .content { min-height:0; align-content:start; gap:14px; }
  :host([data-view=cleaning]) .slot.cleaning { height:auto; min-height:0; }
  @media(min-width:1700px) { .shell { grid-template-columns:240px minmax(0,1fr); } }
  @media(max-width:1100px) { .shell { grid-template-columns:170px minmax(0,1fr); } aside { padding:28px 12px; } .brand { font-size:16px; } .slot.rooms,.slot.devices { grid-column:span 12; } .slot.compact { grid-column:span 6; } }
  @media(max-width:700px) { .shell { display:flex; flex-direction:column; } aside { padding:16px; border:0; gap:18px; display:contents; } .brand,.footnote { display:none; } main { padding:22px 16px 92px; } .topline { margin-bottom:22px; letter-spacing:1px; } .heading { font-size:28px; } nav { position:fixed; inset:auto 12px 12px; z-index:10; flex-direction:row; overflow:visible; gap:2px; padding:7px; border:1px solid var(--mb-line); background:var(--mb-surface); border-radius:22px; box-shadow:0 8px 28px #00000012; } a { flex:1; min-width:58px; gap:5px; flex-direction:column; padding:10px 5px; font-size:9px; white-space:nowrap; } .secondary { display:none; } .more-menu { display:block; flex:1; min-width:58px; } summary { display:flex; flex-direction:column; align-items:center; gap:5px; padding:10px 5px; font-size:9px; color:var(--mb-muted); cursor:pointer; list-style:none; } summary::-webkit-details-marker { display:none; } .more-links { position:absolute; bottom:calc(100% + 12px); right:0; min-width:180px; padding:8px; background:var(--mb-surface); border:1px solid var(--mb-line); border-radius:18px; box-shadow:0 8px 24px #0002; } .more-links a { flex-direction:row; font-size:12px; padding:14px; } nav svg { width:19px; height:19px; } .content { gap:16px; } .slot,.slot.compact { grid-column:1/-1; } .status { font-size:9px; } :host([data-view=cleaning]) main { padding:12px 10px 76px; } :host([data-view=cleaning]) .topline { margin-bottom:6px; } :host([data-view=cleaning]) .heading { font-size:22px; } }
  @media(max-width:700px) { :host([data-view=home]) .slot.cleaning { grid-column:1/-1; height:auto; min-height:0; } }
  @media(max-width:700px) { :host([data-view=cleaning]) .slot.cleaning,:host([data-view=cleaning]) .slot.cleaning-map { grid-column:1/-1; } }
  :host([data-theme=atmospheric]) .shell,:host([data-theme=storybook]) .shell { grid-template-columns:minmax(0,1fr); }
  :host([data-theme=atmospheric]) aside,:host([data-theme=storybook]) aside { display:contents; }
  :host([data-theme=atmospheric]) .brand,:host([data-theme=atmospheric]) .footnote,:host([data-theme=storybook]) .brand,:host([data-theme=storybook]) .footnote { display:none; }
  :host([data-theme=atmospheric]) nav,:host([data-theme=storybook]) nav { position:fixed; inset:auto auto 18px 50%; transform:translateX(-50%); z-index:10; flex-direction:row; gap:4px; padding:7px; max-width:calc(100% - 28px); background:var(--mb-surface); border:1px solid var(--mb-line); border-radius:24px; backdrop-filter:blur(22px); box-shadow:0 15px 40px #0002; }
  :host([data-theme=atmospheric]) main,:host([data-theme=storybook]) main { padding-bottom:110px; }
  :host([data-view=home][data-theme=atmospheric]) main,:host([data-view=home][data-theme=storybook]) main { padding-bottom:150px; }
  :host([data-theme=atmospheric]) .slot.rooms,:host([data-theme=storybook]) .slot.rooms { grid-column:1/-1; }
  :host([data-theme=atmospheric]) .slot.devices,:host([data-theme=storybook]) .slot.devices { grid-column:1/-1; }
  :host([data-theme=storybook]) main { padding-bottom:240px; }
  @media(min-width:701px) and (max-width:1100px) {
    :host([data-theme=atmospheric]) nav .secondary,:host([data-theme=storybook]) nav .secondary { display:none; }
    :host([data-theme=atmospheric]) .more-menu,:host([data-theme=storybook]) .more-menu { display:block; position:relative; }
    :host([data-theme=atmospheric]) summary,:host([data-theme=storybook]) summary { display:flex; align-items:center; gap:13px; min-height:48px; padding:12px 15px; color:var(--mb-muted); font-size:13px; font-weight:600; cursor:pointer; list-style:none; }
    :host([data-theme=atmospheric]) summary::-webkit-details-marker,:host([data-theme=storybook]) summary::-webkit-details-marker { display:none; }
    :host([data-theme=atmospheric]) .more-links,:host([data-theme=storybook]) .more-links { position:absolute; right:0; bottom:calc(100% + 12px); min-width:210px; padding:8px; background:var(--mb-soft); border:1px solid var(--mb-line); border-radius:18px; box-shadow:0 8px 24px #0002; }
  }
  @media(max-width:700px) { :host([data-theme=atmospheric]) nav,:host([data-theme=storybook]) nav { inset:auto 12px 12px; transform:none; } }
  @media(max-width:1100px) { :host([data-view=calendar][data-full-view=true]) main { padding-left:18px; padding-right:18px; } }
  @media(orientation:portrait) and (max-width:1100px) {
    :host([data-view=home]) .content { grid-template-columns:minmax(0,1fr); grid-template-rows:none; }
    :host([data-view=home]) .content > .slot { grid-column:1/-1; grid-row:auto; }
    :host([data-view=cleaning]) .content > .slot { grid-column:1/-1; }
  }
  @media(prefers-reduced-motion:no-preference) { a { transition:background .15s,color .15s; } }
  .view-header { display:flex; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:20px; }
  .view-header .heading { margin:0; }
  .back-link { display:inline-flex; flex-direction:row; flex:none; min-height:44px; padding:10px 14px; font-size:13px; background:var(--mb-surface); border:1px solid var(--mb-line); }
  :host([data-view=rooms]) { height:100dvh; min-height:0; overflow:hidden; }
  :host([data-view=rooms]) .shell { height:100%; min-height:0; }
  :host([data-view=rooms]) main { height:100%; min-height:0; max-width:none; padding:12px 16px var(--mb-nav-space,140px); display:flex; flex-direction:column; }
  :host([data-view=rooms]) .content { display:flex; flex:1; min-height:0; }
  :host([data-view=rooms]) .slot { width:100%; height:100%; min-height:0; }
  :host([data-view=presence]) main,:host([data-view=system]) main,:host([data-view=climate]) main { padding:20px clamp(16px,3vw,46px) max(120px,var(--mb-nav-space,140px)); }
  :host([data-view=expert]) main { max-width:none; padding:20px clamp(16px,3vw,46px) max(120px,var(--mb-nav-space,140px)); }
  :host([data-theme=atmospheric]) nav,:host([data-theme=storybook]) nav { width:max-content; max-width:calc(100% - 24px); gap:2px; padding:6px; flex-wrap:nowrap; }
  :host([data-theme=atmospheric]) nav a,:host([data-theme=storybook]) nav a { display:flex; flex:0 1 auto; min-width:44px; min-height:44px; flex-direction:column; gap:5px; padding:10px 12px; font-size:11px; }
  :host([data-theme=atmospheric]) nav svg,:host([data-theme=storybook]) nav svg { width:22px; height:22px; }
  @media(max-width:700px) {
    nav { flex-wrap:nowrap; gap:0; padding:6px; }
    nav a,:host([data-theme=atmospheric]) nav a,:host([data-theme=storybook]) nav a { flex:1 1 0; min-width:0; min-height:44px; padding:10px 4px; }
    nav a span { display:none; }
    :host([data-theme=atmospheric]) nav,:host([data-theme=storybook]) nav { width:calc(100% - 24px); gap:0; }
  }
  :host([data-view=cleaning]) main { padding-bottom:max(128px,var(--mb-nav-space,140px)); }
  :host([data-view=presence]) .slot,:host([data-view=system]) .slot,:host([data-view=climate]) .slot.rooms { grid-column:1/-1; }
  :host([data-view=presence]),:host([data-view=system]) { min-height:100dvh; --mb-detail-height:max(320px,calc(100dvh - 230px)); }
  .slot.cleaning-map { position:relative; }
  .camera-viewport { overflow:hidden; touch-action:none; cursor:grab; }
  .camera-content,.camera-content > * { display:block; height:100%; width:100%; transform-origin:center; }
  .camera-toolbar { position:absolute; top:10px; right:10px; display:flex; gap:6px; }
  .slot.cleaning-map > .camera-toolbar { width:auto; height:auto; }
  .camera-toolbar button { min-width:44px; min-height:44px; font:inherit; color:var(--mb-ink); background:var(--mb-surface); border:1px solid var(--mb-line); border-radius:12px; cursor:pointer; }
  .camera-toolbar button:focus-visible { outline:2px solid var(--mb-accent); outline-offset:2px; }
  @media(min-width:701px) {
    :host([data-view=rooms][data-theme=calm]) main { padding-bottom:16px; }
  }
  @media(max-width:700px) {
    :host([data-view=rooms]) main { padding:8px 8px var(--mb-nav-space,110px); }
    :host([data-view=presence]) main,:host([data-view=system]) main,:host([data-view=climate]) main { padding:16px 12px max(110px,var(--mb-nav-space,110px)); }
  }
`;
