import * as crypto from 'crypto';

const SECRET = process.env.JWT_SECRET || 'yacajobs-admin-secret-key-2026';

export function signToken(payload: any, expiresInSeconds = 86400): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload = { ...payload, exp };
  
  const headerStr = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadStr = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(`${headerStr}.${payloadStr}`)
    .digest('base64url');
    
  return `${headerStr}.${payloadStr}.${signature}`;
}

export function verifyToken(token: string): any {
  try {
    const [headerStr, payloadStr, signature] = token.split('.');
    if (!headerStr || !payloadStr || !signature) return null;
    
    const expectedSignature = crypto
      .createHmac('sha256', SECRET)
      .update(`${headerStr}.${payloadStr}`)
      .digest('base64url');
      
    if (signature !== expectedSignature) return null;
    
    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}
