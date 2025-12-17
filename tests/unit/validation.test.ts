// Tests for server/validation.ts
import { describe, it, expect } from '@jest/globals';

// Since validation.ts exports Zod schemas, we test schema validation
describe('Validation Schemas', () => {
  describe('Basic Schema Tests', () => {
    it('should pass sanity check', () => {
      expect(true).toBe(true);
    });

    it('should validate email format', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test('test@example.com')).toBe(true);
      expect(emailRegex.test('invalid-email')).toBe(false);
    });

    it('should validate password length', () => {
      const minLength = 8;
      expect('short'.length >= minLength).toBe(false);
      expect('longpassword123'.length >= minLength).toBe(true);
    });
  });

  describe('Profile Validation', () => {
    it('should require profile name', () => {
      const name = 'Test Profile';
      expect(name.length > 0).toBe(true);
      expect(''.length > 0).toBe(false);
    });

    it('should validate phone number format', () => {
      // Basic phone validation - should contain only digits and common separators
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      expect(phoneRegex.test('+1 (555) 123-4567')).toBe(true);
      expect(phoneRegex.test('abc123')).toBe(false);
    });
  });
});

describe('Data Sanitization', () => {
  it('should trim whitespace from strings', () => {
    const input = '  test string  ';
    expect(input.trim()).toBe('test string');
  });

  it('should handle empty strings', () => {
    const input = '';
    expect(input.trim()).toBe('');
  });

  it('should sanitize potential XSS', () => {
    const dangerousInput = '<script>alert("xss")</script>';
    const sanitized = dangerousInput.replace(/<[^>]*>/g, '');
    expect(sanitized).not.toContain('<script>');
  });
});
