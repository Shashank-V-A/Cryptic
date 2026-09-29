import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encryptSecret, decryptSecret, maskSecret } from './crypto.js';

const KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('crypto helpers', () => {
  it('round-trips secrets', () => {
    const encrypted = encryptSecret('coindcx-secret', KEY);
    assert.notEqual(encrypted, 'coindcx-secret');
    assert.equal(decryptSecret(encrypted, KEY), 'coindcx-secret');
  });

  it('masks secrets for logs', () => {
    assert.equal(maskSecret('abcdefghijklmnop'), 'abcd…mnop');
  });
});
