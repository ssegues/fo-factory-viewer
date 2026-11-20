// Product icons: which pictogram stands for an item. Shared by both pages and by the local server (validation).
// No Three.js here, so Node can import it too. Presentation only: nothing is read from or written to the ERP.
//
// Precedence: a rule for the item › a rule for its product group › a word in its name › a plain box.

export const ICON_NAMES = {
  speaker: 'Speaker', cable: 'Cable', board: 'Electronics', magnet: 'Magnet', coil: 'Coil', laser: 'Laser and optics', screen: 'Screen',
  foam: 'Foam and rubber', casing: 'Casing', metal: 'Metal part', packaging: 'Packaging', liquid: 'Liquid', kit: 'Kit', none: 'Plain box',
};

// Checked in order; the first match wins. Names are split into words first ("SpeakerCable" → "speaker cable"),
// so the most specific words come before the general ones (a speaker cable is a cable, a speaker cabinet a casing).
export const NAME_RULES = [
  [/\bkit\b|\bset\b|solution|bundle/, 'kit'],
  [/cable|wire|wiring|harness|cord|hdmi|\bplug|binding post/, 'cable'],
  [/magnet|ferrite|\byoke|\bcore\b/, 'magnet'],
  [/coil|winding|spring/, 'coil'],
  [/\bpcb|board|circuit|crossover|amplifier|firmware|\bchip|electric|electronic|power supply|controller/, 'board'],
  [/laser|\blens|optic|projector/, 'laser'],
  [/screen|display|monitor|\blcd|\btv\b/, 'screen'],
  [/foam|\bfoa\b|acoustic|damping|gasket|rubber|suspension|cloth|spider/, 'foam'],
  [/packag|carton|\bbox|\bbag\b|label|protective|corner|pallet/, 'packaging'],
  [/paint|glue|adhesive|lacquer|\boil\b|resin|liquid|solvent/, 'liquid'],
  [/cabinet|enclosure|\bcase\b|housing|cover|grill|\bcap\b|dustcap/, 'casing'],
  [/frame|basket|plate|chassis|\bring|bracket|screw|bolt|\bnut\b|washer|steel|metal|blank|sheet/, 'metal'],
  [/speaker|woofer|tweeter|driver|\bcone|soundbar|audio|radio|car ra/, 'speaker'],
];

/** "SpeakerconeST5611" → "speakercone st 5611": words a rule can match. */
export const words = (name) => String(name ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Za-z])(\d)/g, '$1 $2').replace(/[_\-./]+/g, ' ').toLowerCase();

export function iconFromName(name) {
  const text = words(name); if (!text) return null;
  return NAME_RULES.find(([re]) => re.test(text))?.[1] ?? null;
}

/** items: { id: { name, group } }. rules: { byItem, byGroup }. Returns (id) => { icon, rule } where icon null means a plain box. */
export function iconResolver(items, rules) {
  return (id) => {
    const item = items?.[id], set = (icon) => (icon === 'none' ? null : icon);
    if (rules?.byItem?.[id]) return { icon: set(rules.byItem[id]), rule: 'item' };
    if (item?.group && rules?.byGroup?.[item.group]) return { icon: set(rules.byGroup[item.group]), rule: `product group ${item.group}` };
    const named = iconFromName(item?.name);
    if (named) return { icon: named, rule: 'name' };
    return { icon: null, rule: item ? 'no rule' : 'no name read' };
  };
}

/** Validation for the local server: keeps only known icons on short keys. */
export function cleanIconRules(input) {
  const map = (value) => {
    const out = {};
    for (const [key, icon] of Object.entries(value && typeof value === 'object' ? value : {})) {
      if (key.length > 80 || !Object.hasOwn(ICON_NAMES, icon)) throw new Error(`Unknown icon for "${key.slice(0, 80)}".`);
      out[key] = icon;
    }
    return out;
  };
  return { byItem: map(input?.byItem), byGroup: map(input?.byGroup) };
}
