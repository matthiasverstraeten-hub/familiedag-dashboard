const NB_SUBDOMAIN = process.env.NB_SUBDOMAIN;
const NB_API_KEY = process.env.NB_API_KEY;

async function fetchAllPages(url) {
  let results = [];
  let nextUrl = url;
  while (nextUrl) {
    const res = await fetch(nextUrl, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(NB_API_KEY + ':ignored').toString('base64'),
        'Accept': 'application/json',
      }
    });
    if (!res.ok) throw new Error('NationBuilder fout ' + res.status + ': ' + await res.text());
    const data = await res.json();
    results = results.concat(data.results || data.people || []);
    nextUrl = data.next ? 'https://' + NB_SUBDOMAIN + '.nationbuilder.com' + data.next : null;
  }
  return results;
}

function countKids(p) {
  let n = 0;
  for (let i = 1; i <= 3; i++) {
    const v = p['plopsaland_kind' + i + '_naam'] || (p.custom_values || {})['plopsaland_kind' + i + '_naam'];
    if (v && v.trim()) n++;
  }
  return n;
}

function groupByDay(people) {
  const map = {};
  for (const p of people) {
    const raw = p.created_at;
    if (!raw) continue;
    const day = raw.substring(0, 10);
    map[day] = (map[day] || 0) + 1;
  }
  let cum = 0;
  return Object.entries(map).sort().map(([date, count]) => {
    cum += count;
    return { date, count, cumulative: cum };
  });
}

function groupByWeek(people) {
  const map = {};
  for (const p of people) {
    const raw = p.created_at;
    if (!raw) continue;
    const d = new Date(raw);
    const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
    const mon = new Date(d);
    mon.setDate(d.getDate() + diff);
    const week = mon.toISOString().substring(0, 10);
    map[week] = (map[week] || 0) + 1;
  }
  return Object.entries(map).sort().map(([week, count]) => ({ week, count }));
}

module.exports = async function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (!NB_SUBDOMAIN || !NB_API_KEY) {
    return res.status(500).json({ error: 'NB_SUBDOMAIN of NB_API_KEY ontbreekt in environment variables.' });
  }
  try {
    const base = 'https://' + NB_SUBDOMAIN + '.nationbuilder.com';
    const people = await fetchAllPages(base + '/api/v1/tags/Plopsa%202026/people?limit=100');

    let surveyPeople = [];
    try {
      surveyPeople = await fetchAllPages(base + '/api/v1/pages/survey/familiedag-plopsaland-2026/responses?limit=100');
    } catch (e) { /* pagina niet gevonden, ok */ }

    const byId = new Map();
    for (const p of people) byId.set(p.id, p);
    for (const r of surveyPeople) { const p = r.person || r; if (p.id) byId.set(p.id, p); }
    const all = Array.from(byId.values());

    let totalKids = 0;
    const dist = { 0: 0, 1: 0, 2: 0, 3: 0 };
    for (const p of all) { const k = countKids(p); totalKids += k; dist[k] = (dist[k] || 0) + 1; }

    res.status(200).json({
      registrations: all.length,
      totalKids,
      totalAttendees: all.length + totalKids,
      kidsDistribution: dist,
      byDay: groupByDay(all),
      byWeek: groupByWeek(all),
      lastUpdated: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
