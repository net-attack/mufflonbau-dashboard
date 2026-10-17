import { element, navigateLink } from '../design/dom.js';
import { localized } from '../core/i18n.js';
import { ventilationStatus } from '../core/ventilation.js';

export const ventilationStyles = `
  .ventilation-summary .summary-icon { position:relative; }
  .ventilation-summary .summary-icon:after { content:''; position:absolute; right:-3px; bottom:-3px; width:10px; height:10px; border-radius:50%; border:2px solid var(--mb-surface); background:var(--mb-muted); }
  .ventilation-summary[data-status=dry] .summary-icon:after,.ventilation-dot.dry { background:#3e9274; }
  .ventilation-summary[data-status=wait] .summary-icon:after,.ventilation-dot.wait { background:#b08622; }
  .ventilation-dot.wetter { background:#b55e45; }
  .ventilation-intro { color:var(--mb-muted); font-size:14px; line-height:1.6; margin:0 0 18px; }
  .ventilation-outdoor { border:1px solid var(--mb-line); background:var(--mb-soft); border-radius:16px; padding:16px; margin-bottom:18px; }
  .ventilation-outdoor h3,.ventilation-room h3 { margin:0; font-size:16px; font-weight:650; }
  .ventilation-rooms { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,290px),1fr)); gap:14px; }
  .ventilation-room { border:1px solid var(--mb-line); padding:18px; border-radius:18px; min-width:0; }
  .ventilation-room h3 a { color:inherit; text-decoration:none; display:flex; min-height:44px; align-items:center; }
  .ventilation-status { display:flex; align-items:center; gap:9px; font-size:15px; font-weight:650; margin:8px 0 14px; }
  .ventilation-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; background:var(--mb-muted); }
  .ventilation-room p { font-size:14px; line-height:1.6; }
  .ventilation-readings { display:flex; gap:8px; flex-wrap:wrap; margin:10px 0; }
  .ventilation-readings button { font:inherit; font-size:14px; min-height:44px; border:1px solid var(--mb-line); background:var(--mb-soft); border-radius:10px; padding:8px 12px; }
  .ventilation-metrics { color:var(--mb-muted); font-size:13px; line-height:1.7; margin-top:8px; }
  .ventilation-issue { overflow-wrap:anywhere; font-size:13px; line-height:1.6; margin-top:8px; }
  .ventilation-issue button { text-decoration:underline; min-height:44px; display:block; padding:6px 0; font-size:13px; }
  .ventilation-help { margin-top:18px; border-top:1px solid var(--mb-line); padding-top:16px; font-size:13px; color:var(--mb-muted); line-height:1.6; }
`;

export function renderVentilation(owner, card, text) {
  const config = owner._config;
  const model = ventilationStatus(config.ventilation, config.rooms ?? [], owner._hass.states);
  const number = (value, unit) => value === null ? '—' : `${new Intl.NumberFormat(owner._language, { maximumFractionDigits: 1 }).format(value)} ${unit}`;
  const title = text.ventilation;
  if (config.compact) {
    card.classList.add('dashboard-summary', 'ventilation-summary');
    card.dataset.status = model.ready ? 'dry' : model.rooms.some(item => ['wait', 'wetter'].includes(item.status)) ? 'wait' : 'neutral';
    const status = model.ready ? `${model.ready} ${model.ready === 1 ? text.room : text.rooms} · ${text.ventilationDry}` :
      model.unknown === model.rooms.length ? text.ventilationCheck :
      model.rooms.some(item => item.status === 'wait') ? text.ventilationWait :
      model.rooms.some(item => item.status === 'wetter') ? text.ventilationWetter : text.ventilationNoNeed;
    owner._summaryLink(card, 'ventilation', 'ventilation', title, status,
      model.unknown && model.unknown < model.rooms.length ? `${model.unknown} ${model.unknown === 1 ? text.room : text.rooms} · ${text.ventilationCheck}` : undefined);
    return;
  }
  owner._section(card, title);
  card.append(element('p', text.ventilationIntro, 'ventilation-intro'));
  const issue = (parent, item) => {
    const row = element('div', undefined, 'ventilation-issue');
    row.append(element('span', text[item.problem]));
    if (item.entity) {
      const button = element('button', `${owner._name(item.entity)} · ${item.entity}`); button.type = 'button'; button.dataset.entity = item.entity;
      button.addEventListener('click', () => owner._moreInfo(item.entity)); row.append(button);
    }
    parent.append(row);
  };
  const readings = (parent, temperature, humidity, values) => {
    const row = element('div', undefined, 'ventilation-readings');
    for (const [id, value, unit, label] of [[temperature, values.temperature, '°C', text.temperature], [humidity, values.humidity, '%', text.humidity]]) {
      const button = element('button', number(value, unit)); button.type = 'button'; button.dataset.entity = id;
      button.setAttribute('aria-label', `${label}: ${number(value, unit)}`);
      button.addEventListener('click', () => owner._moreInfo(id)); row.append(button);
    }
    parent.append(row);
    parent.append(element('div', `${text.ventilationAbsolute}: ${number(values.absolute, 'g/m³')} · ${text.dewPoint}: ${number(values.dewPoint, '°C')}`, 'ventilation-metrics'));
  };
  const outdoor = element('section', undefined, 'ventilation-outdoor');
  outdoor.append(element('h3', text.ventilationOutdoor));
  if (model.outdoor.issues.length) model.outdoor.issues.forEach(item => issue(outdoor, item));
  else readings(outdoor, config.ventilation.outdoor_temperature, config.ventilation.outdoor_humidity, model.outdoor);
  card.append(outdoor);
  const grid = element('div', undefined, 'ventilation-rooms');
  for (const item of model.rooms) {
    const section = element('section', undefined, 'ventilation-room'); section.dataset.room = item.room.id;
    const heading = element('h3'); const link = element('a', localized(item.room.name, owner._language)); navigateLink(link, `room-${item.room.id}`); heading.append(link); section.append(heading);
    const status = element('p', undefined, 'ventilation-status');
    status.append(element('span', undefined, `ventilation-dot ${item.status}`), element('span', text[{
      dry: 'ventilationDry', wetter: 'ventilationWetter', wait: 'ventilationWait', comfortable: 'ventilationNoNeed', dryIndoor: 'ventilationAlreadyDry', unknown: 'ventilationCheck',
    }[item.status]])); section.append(status);
    if (item.issues.length) {
      item.indoor.issues.forEach(problem => issue(section, problem));
      if (model.outdoor.issues.length) section.append(element('p', text.ventilationOutdoorMissing));
    } else {
      readings(section, item.room.temperature, item.room.humidity, item.indoor);
      section.append(element('p', text[{
        dry: 'ventilationDryDetail', wetter: 'ventilationWetterDetail', wait: 'ventilationWaitDetail', comfortable: 'ventilationNoNeedDetail', dryIndoor: 'ventilationAlreadyDryDetail',
      }[item.status]]));
      section.append(element('p', text[`ventilationComfort_${item.comfort}`]));
      section.append(element('div', `${text.ventilationDifference}: ${number(item.difference, 'g/m³')}`, 'ventilation-metrics'));
    }
    grid.append(section);
  }
  card.append(grid, element('p', text.ventilationHelp.replace('{humidity}', String(config.ventilation.humidity_high)).replace('{difference}', number(config.ventilation.min_drying_difference, 'g/m³')).replace('{age}', String(config.ventilation.max_age_minutes)), 'ventilation-help'));
}
