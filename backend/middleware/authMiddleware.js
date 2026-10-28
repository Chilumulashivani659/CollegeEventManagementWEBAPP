import jwt from 'jsonwebtoken';
import * as coordinatorService from '../services/coordinatorService.js';

/**
 * Every protected request verifies the JWT *and* re-reads the coordinator
 * from MySQL. This means approval can be revoked immediately, and a token
 * cannot keep management access alive on its own.
 */
export const requireApprovedCoordinator = async (req, res, next) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET is not configured.');
    return res.status(500).json({ message: 'Server authentication is not configured.' });
  }

  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      message: 'Authentication required. Please log in as an approved coordinator.'
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

  try {
    const coordinator = await coordinatorService.findById(payload.sub);

    if (!coordinator) {
      return res.status(401).json({
        message: 'This coordinator account no longer exists. Please log in again.'
      });
    }

    if (coordinator.status !== 'approved') {
      return res.status(403).json({
        message:
          coordinator.status === 'rejected'
            ? 'Your coordinator account was not approved, so event management is not allowed.'
            : 'Your coordinator account is pending approval. Event management is not allowed yet.'
      });
    }

    req.coordinator = coordinator;
    return next();
  } catch (err) {
    return next(err);
  }
};

export default requireApprovedCoordinator;
