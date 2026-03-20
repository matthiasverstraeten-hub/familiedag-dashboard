module.exports = async function (req, res) {
  const { code } = req.query;
  if (!code) return res.send('Geen code gevonden.');
  res.send(`
    <h2>Jouw code:</h2>
    <p style="font-size:1.2rem;word-break:break-all;background:#eee;padding:16px;border-radius:8px">${code}</p>
    <p>Kopieer deze code en stuur hem naar Claude.</p>
  `);
};
```
