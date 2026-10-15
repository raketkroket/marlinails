// Price rules shared by the admin editor (browser) and the admin API (server).
// A row has `price` (kort or the only price), optional `medium`, `hand` (rises with
// the scheduled change) and optional scheduled overrides `next` / `nextMedium`.
// Must stay consistent with priceOf() in public/app.js (tests check this).

export const SIZES = [['price', 'next', 'Kort'], ['medium', 'nextMedium', 'Medium']];

export function amsterdamToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

const has = value => value !== null && value !== undefined && value !== '';
export const round = value => Math.round(Number(value) * 100) / 100;

export function changePending(prijzen, today) {
  return Boolean(prijzen.change && prijzen.change.date && today < prijzen.change.date);
}

export function sizesOf(row) {
  return SIZES.filter(([key]) => key === 'price' || has(row.medium));
}

// Price per size from the scheduled date onwards.
export function futureOf(row, key, change) {
  const nextKey = key === 'price' ? 'next' : 'nextMedium';
  if (has(row[nextKey])) return round(row[nextKey]);
  return round(Number(row[key]) + (row.hand && change ? Number(change.increase) : 0));
}

// What the editor shows for one size: current price and how it changes on the date.
export function describe(row, key, change) {
  const nextKey = key === 'price' ? 'next' : 'nextMedium';
  const current = round(row[key]);
  if (!change) return { current, future: current, mode: 'none' };
  const future = futureOf(row, key, change);
  let mode = 'none';
  if (has(row[nextKey])) mode = future === current ? 'none' : 'custom';
  else if (row.hand) mode = 'auto';
  return { current, future, mode };
}

// Rebuilds the row fields from per-size choices: { price: {current, mode, custom}, medium: {...} }.
export function encode(row, choices) {
  const next = { ...row };
  const sizes = sizesOf(row).map(([key, nextKey]) => [key, nextKey, choices[key]]);
  for (const [key, , choice] of sizes) next[key] = round(choice.current);
  next.hand = sizes.some(([, , choice]) => choice.mode === 'auto');
  for (const [, nextKey, choice] of sizes) {
    if (choice.mode === 'custom') next[nextKey] = round(choice.custom);
    else if (choice.mode === 'none' && next.hand) next[nextKey] = round(choice.current);
    else next[nextKey] = null;
  }
  if (!has(row.medium)) next.nextMedium = null;
  return next;
}

export function choicesOf(row, change) {
  return Object.fromEntries(sizesOf(row).map(([key]) => {
    const info = describe(row, key, change);
    return [key, { current: info.current, mode: info.mode, custom: info.future }];
  }));
}

// After the scheduled date the new prices become the normal prices.
export function rollOver(prijzen, today) {
  if (!prijzen.change || !prijzen.change.date || today < prijzen.change.date) return prijzen;
  const change = prijzen.change;
  return {
    ...prijzen,
    since: change.date,
    change: null,
    groups: prijzen.groups.map(group => ({
      ...group,
      rows: group.rows.map(row => ({
        ...row,
        price: futureOf(row, 'price', change),
        medium: has(row.medium) ? futureOf(row, 'medium', change) : null,
        hand: false,
        next: null,
        nextMedium: null
      }))
    }))
  };
}

export const euro = value => Number(value) === 0 ? 'Gratis' : `€ ${round(value).toFixed(2).replace('.', ',')}`;

export function dutchDate(iso) {
  return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${iso}T00:00:00Z`));
}
