import { describe, it, expect } from 'vitest';
import { getValidThumbnailUrl, TARGET_YOUTUBE_THUMBNAIL_DOMAIN, BLOCKED_YOUTUBE_THUMBNAIL_DOMAIN } from '../youtubeUtils';

describe('youtubeUtils - getValidThumbnailUrl', () => {
  it('should rewrite i.ytimg.com domain to img.youtube.com', () => {
    const original = 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg';
    const expected = `https://${TARGET_YOUTUBE_THUMBNAIL_DOMAIN}/vi/dQw4w9WgXcQ/hqdefault.jpg`;
    expect(getValidThumbnailUrl(original)).toBe(expected);
  });

  it('should leave non-blocked URLs untouched', () => {
    const url = 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg';
    expect(getValidThumbnailUrl(url)).toBe(url);
  });

  it('should return original value when input is null, undefined, or empty string', () => {
    expect(getValidThumbnailUrl(null)).toBe(null);
    expect(getValidThumbnailUrl(undefined)).toBe(undefined);
    expect(getValidThumbnailUrl('')).toBe('');
  });

  it('should handle non-string inputs safely', () => {
    expect(getValidThumbnailUrl(12345)).toBe(12345);
  });
});
