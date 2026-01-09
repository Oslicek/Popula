import { describe, it, expect } from 'vitest';
import { isNavItemActive } from './NavItem';

describe('NavItem', () => {
  describe('isNavItemActive', () => {
    it('returns true when path matches exactly', () => {
      expect(isNavItemActive('/explore', '/explore')).toBe(true);
      expect(isNavItemActive('/data', '/data')).toBe(true);
      expect(isNavItemActive('/admin', '/admin')).toBe(true);
    });

    it('returns true when current path is nested under nav path', () => {
      expect(isNavItemActive('/data', '/data/catalog')).toBe(true);
      expect(isNavItemActive('/data', '/data/files')).toBe(true);
      expect(isNavItemActive('/admin', '/admin/users')).toBe(true);
      expect(isNavItemActive('/admin', '/admin/devtools')).toBe(true);
      expect(isNavItemActive('/scenarios', '/scenarios/123')).toBe(true);
      expect(isNavItemActive('/runs', '/runs/456/compare')).toBe(true);
    });

    it('returns false when paths do not match', () => {
      expect(isNavItemActive('/explore', '/data')).toBe(false);
      expect(isNavItemActive('/data', '/scenarios')).toBe(false);
      expect(isNavItemActive('/admin', '/explore')).toBe(false);
    });

    it('handles root path correctly', () => {
      // Root should only match root exactly
      expect(isNavItemActive('/', '/')).toBe(true);
      expect(isNavItemActive('/', '/explore')).toBe(false);
    });

    it('handles trailing slashes', () => {
      expect(isNavItemActive('/data', '/data/')).toBe(true);
      expect(isNavItemActive('/data/', '/data')).toBe(true);
    });

    it('does not match partial path segments', () => {
      // /data should not match /database
      expect(isNavItemActive('/data', '/database')).toBe(false);
      expect(isNavItemActive('/run', '/runs')).toBe(false);
    });
  });
});
