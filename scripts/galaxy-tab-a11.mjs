// The panel resolution is not necessarily the browser's CSS viewport.
// Exercise both unscaled panel dimensions and an additional 1.5-DPR profile;
// the latter is test coverage, not a measured setting from the user's tablet.
export const galaxyTabA11 = {
  screen: { width: 800, height: 1340 }, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true,
};
export const galaxyProfiles = [
  { name: 'scaled', options: galaxyTabA11, viewports: [
    { name: 'landscape', width: 893, height: 533 }, { name: 'portrait', width: 533, height: 893 },
  ] },
  { name: 'panel', options: { ...galaxyTabA11, deviceScaleFactor: 1 }, viewports: [
    { name: 'landscape', width: 1340, height: 800 }, { name: 'portrait', width: 800, height: 1340 },
  ] },
];
