const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) {
    return res.sendStatus(401); // Unauthorized
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) {
      return res.sendStatus(403); // Forbidden
    }
    // Map userId from JWT payload to user.id for consistency
    req.user = { 
      id: payload.userId,
      userId: payload.userId 
    };
    next(); // Proceed to the next function
  });
};

module.exports = authMiddleware;