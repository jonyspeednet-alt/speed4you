const { trackActiveUser } = require('../data/store/activeUsers');

function trackActiveUserMiddleware(req, res, next) {
  try {
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ip = String(rawIp).split(',')[0].trim();
    const userAgent = req.headers['user-agent'] || '';
    trackActiveUser(ip, userAgent);
  } catch {
    // silent fail — tracking is best-effort
  }
  next();
}

module.exports = trackActiveUserMiddleware;
