module.exports = (req, res) => {
  res.json({
    status: "ok",
    message: "WeWe RSS API running",
    version: "2.6.1",
    timestamp: new Date().toISOString()
  });
};