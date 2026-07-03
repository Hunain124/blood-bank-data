module.exports = (req, res) => {
  res.status(200).json({ ok: true, uptime: Math.floor(process.uptime()) });
};
