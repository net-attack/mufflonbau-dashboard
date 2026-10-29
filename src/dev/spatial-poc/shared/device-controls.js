import { isLightEntity, lightState } from './model.js';
// One native control surface for all renderers. No simulated action leaves the
// in-memory store, and a setpoint is independent of the measured room temperature.
export function mountDeviceControls(panel, id, popup) {
  const addButton = (text, fn, action) => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = text;
    if (action) button.dataset.deviceAction = action;
    button.onclick = fn; popup.append(button); return button;
  };
  const addRange = (title, key, min, max, step, update, vertical = false) => {
    const label = document.createElement('label'); label.textContent = title;
    const output = document.createElement('output'); output.dataset.output = key; label.append(output);
    const input = document.createElement('input'); Object.assign(input, { type: 'range', min, max, step });
    input.dataset.setting = key; input.setAttribute('aria-label', title); input.oninput = () => update(Number(input.value));
    if (vertical) { label.className = 'fader-control'; input.className = 'vertical-fader'; }
    label.append(input); popup.append(label);
  };
  const addSelect = (title, key, items, update) => {
    const label = document.createElement('label'); label.textContent = title; const select = document.createElement('select');
    select.dataset.setting = key; select.setAttribute('aria-label', title);
    for (const [value, text] of items) { const option = document.createElement('option'); option.value = value; option.textContent = text; select.append(option); }
    select.onchange = () => update(select.value); label.append(select); popup.append(label);
  };
  const dispatch = (type, value) => panel.simulator.dispatch({ type, value, entity: isLightEntity(id) ? id : undefined });
  if (isLightEntity(id)) {
    addRange('Helligkeit', 'brightness', 0, 100, 1, v => dispatch('brightness', v / 100), true);
    addRange('Lichtfarbe · Kelvin', 'colorTemperature', 2200, 6500, 100, v => dispatch('color-temperature', v));
    const label = document.createElement('label'); label.className = 'color-setting'; label.textContent = 'Lichtfarbe';
    const color = document.createElement('input'); color.type = 'color'; color.dataset.setting = 'color'; color.setAttribute('aria-label', 'Lichtfarbe auswählen');
    color.oninput = () => dispatch('light-color', color.value); label.append(color); popup.append(label);
    addButton('Licht umschalten', () => dispatch('toggle-light'), 'toggle-light');
  }
  if (id === 'heating') {
    addRange('Solltemperatur', 'targetTemperature', 5, 30, .5, v => dispatch('target-temperature', v), true);
    addButton('Heizung umschalten', () => dispatch('toggle-heating'), 'toggle-heating');
  }
  if (id === 'vacuum') {
    addSelect('Reinigungsmodus', 'mode', [['vacuum', 'Saugen'], ['mop', 'Wischen'], ['combined', 'Saugen + Wischen']], value => panel.simulator.update({ vacuum: { mode: value } }));
    addSelect('Saugstufe', 'suction', [['quiet', 'Leise'], ['standard', 'Standard'], ['turbo', 'Turbo']], value => panel.simulator.update({ vacuum: { suction: value } }));
    const actions = document.createElement('div'); actions.className = 'vacuum-actions'; popup.append(actions);
    for (const [text, state] of [['Start / Weiter', 'cleaning'], ['Pause', 'paused'], ['Zur Station', 'returning'], ['Stopp', 'idle']]) {
      const button = addButton(text, () => dispatch('vacuum-state', state), `vacuum-${state}`); actions.append(button);
    }
  }
  if (isLightEntity(id) || id === 'heating') {
    const hint = document.createElement('small'); hint.className = 'fader-hint'; hint.textContent = 'Halten + hoch/runter ziehen oder den Regler bedienen.'; popup.append(hint);
  }
}
export function refreshDeviceControls(panel) {
  const { popup, selected, state } = panel;
  for (const input of popup.querySelectorAll('[data-setting]')) {
    const key = input.dataset.setting, value = isLightEntity(selected) ? key === 'brightness' ? Math.round(lightState(state,selected).brightness * 100) : lightState(state,selected)[key] : state[selected][key];
    input.value = value;
    const output = popup.querySelector(`[data-output="${key}"]`);
    if (output) output.textContent = key === 'brightness' ? `${value} %` : key === 'targetTemperature' ? `${Number(value).toFixed(1)} °C` : `${value} K`;
  }
  const color = popup.querySelector('.color-setting'); if (color) color.hidden = !lightState(state,selected).supportsColor;
  popup.querySelector('[data-device-action="vacuum-cleaning"]')?.toggleAttribute('disabled', state.vacuum.state === 'cleaning');
  popup.querySelector('[data-device-action="vacuum-paused"]')?.toggleAttribute('disabled', state.vacuum.state !== 'cleaning');
  const toggle = popup.querySelector('[data-device-action="toggle-heating"]'); if (toggle) toggle.textContent = state.heating.active ? 'Heizung ausschalten' : 'Heizung einschalten';
}
