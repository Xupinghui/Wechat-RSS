module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    status: 'ok',
    message: 'WeWe RSS API is running',
    version: '2.6.1',
    endpoints: {
      feeds: '/feeds/[feed_id].[rss|atom|json]',
      healthCheck: '/healthz'
    },
    timestamp: new Date().toISOString()
  });
}; 