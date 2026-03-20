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
    if (!res.ok) throw new Error('NationBuilder fout ' + res.status);
    const data = await res.json();
    results = results.concat(data.results || data.people || []);
    nextUrl = data.next ? 'https://' + NB_SUBDOMAIN + '.nationbuilder.com' + data.next : null;
  }
  return results;
}

module.exports = async function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (!NB_SUBDOMAIN || !NB_API_KEY) {
    return res.status(500).json({ error: 'NB_SUBDOMAIN of NB_API_KEY ontbreekt.' });
  }
  try {
    const base = 'https://' + NB_SUBDOMAIN + '.nationbuilder.com';
    const people = await fetchAllPages(base + '/api/v1/tags/Plopsa%202026/people?limit=100');

    const src = {}, med = {}, cam = {};
    let noUtm = 0;

    for (const p of people) {
      const cv = p.custom_values || {};
      const source   = p.utm_source   || cv.utm_source   || null;
      const medium   = p.utm_medium   || cv.utm_medium   || null;
      const campaign = p.utm_campaign || cv.utm_campaign || null;
      if (!source && !medium) { noUtm++; continue; }
      if (source)   src[source]   = (src[source]   || 0) + 1;
      if (medium)   med[medium]   = (med[medium]   || 0) + 1;
      if (campaign) cam[campaign] = (cam[campaign] || 0) + 1;
    }

    const sort = (m) => Object.entries(m).sort(([,a],[,b]) => b - a).map(([label, count]) => ({ label, count }));

    res.status(200).json({
      bySources:  sort(src),
      byMedium:   sort(med),
      byCampaign: sort(cam),
      noUtm,
      total: people.length,
      lastUpdated: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
