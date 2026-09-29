import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getSessionCookieOptions } from './auth.js';

describe('getSessionCookieOptions', () => {
  it('uses httpOnly session cookies with sameSite lax by default', () => {
    const opts = getSessionCookieOptions({ cookieSecure: true });
    assert.equal(opts.httpOnly, true);
    assert.equal(opts.sameSite, 'lax');
    assert.equal(opts.secure, true);
    assert.equal(opts.path, '/');
  });

  it('forces Secure when SameSite=None', () => {
    const opts = getSessionCookieOptions({ cookieSecure: false, cookieSameSite: 'none' });
    assert.equal(opts.sameSite, 'none');
    assert.equal(opts.secure, true);
  });
});
