import jwt from 'jsonwebtoken';
import * as coordinatorService from '../services/coordinatorService.js';

/**
 * Every protected request verifies the JWT *and* re-reads the coordinator
 * account plus its pre-authorization record from MySQL. Access can therefore
 * be revoked immediately, and a token cannot keep management access alive on
 * its own.
 */
export const requireActiveCoordinator = async (req, res, next) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET is not configured.');
    return res.status(500).json({ message: 'Server authentication is not configured.' });
  }

  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      message: 'Authentication required. Please log in as an event coordinator.'
    });
  }

  let payload;
  try {
    payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Your session has expired. Please log in again.'
        : 'Invalid or expired session. Please log in again.';
    return res.status(401).json({ message });
  }

  if (payload.role !== 'coordinator') {
    return res.status(401).json({ message: 'Invalid session. Please log in again.' });
  }

  try {
    const coordinator = await coordinatorService.findById(payload.sub);

    if (!coordinator) {
      return res.status(401).json({
        message: 'This coordinator account no longer exists. Please log in again.'
      });
    }

    if (coordinator.status !== 'active' || !coordinator.authorization_active) {
      return res.status(403).json({
        message:
          'Your coordinator access is not active. Contact the college administrator if you believe this is a mistake.'
      });
    }

    const { authorization_active, ...publicCoordinator } = coordinator;
    req.coordinator = publicCoordinator;
    return next();
  } catch (err) {
    return next(err);
  }
};

export default requireActiveCoordinator;
