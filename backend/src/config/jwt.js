import jwt from 'jsonwebtoken';

export const JWT_ALGORITHM = 'HS256';
export const JWT_EXPIRES_IN = '7d';

/**
 * Retrieve and validate the JWT Secret.
 * Fails safely if missing or insecurely configured, without exposing secret in logs.
 */
export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim().length === 0) {
    throw new Error(
      'FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is required and must not be empty. Server startup halted.'
    );
  }
  if (secret.trim().length < 16) {
    throw new Error(
      'FATAL CONFIGURATION ERROR: JWT_SECRET must be at least 16 characters long for cryptographic security. Server startup halted.'
    );
  }
  return secret.trim();
};

/**
 * Validate JWT configuration during backend startup (fail-fast)
 */
export const validateJwtConfig = () => {
  getJwtSecret();
  return true;
};

/**
 * Sign a new JWT token using strict algorithm and expiration
 */
export const signToken = (userId) => {
  const secret = getJwtSecret();
  return jwt.sign({ userId: userId.toString() }, secret, {
    algorithm: JWT_ALGORITHM,
    expiresIn: JWT_EXPIRES_IN,
  });
};

/**
 * Verify a JWT token using strict algorithm verification
 */
export const verifyToken = (token) => {
  const secret = getJwtSecret();
  return jwt.verify(token, secret, {
    algorithms: [JWT_ALGORITHM],
  });
};

