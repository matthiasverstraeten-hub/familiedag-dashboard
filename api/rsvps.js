module.exports = async function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'Geen code meegegeven.' });

  const CLIENT_ID     = process.env.NB_CLIENT_ID;
  const CLIENT_SECRET = process.env.NB_CLIENT_SECRET;
  const SUBDOMAIN     = process.env.NB_SUBDOMAIN;
  const REDIRECT_URI  = process.env.NB_REDIRECT_URI;

  try {
    const r = await fetch('https://' + SUBDOMAIN + '.nationbuilder.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code,
      }),
    });
    const data = await r.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
```


