export const handleThumbnailLoad = (e, placeholder) => {
  // Detect YouTube broken thumbnail (exact 120x90 gray image)
  if (
    e.target.naturalWidth === 120 &&
    e.target.naturalHeight === 90 &&
    !e.target.src.includes('placeholder')
  ) {
    e.target.onerror = null;
    e.target.src = placeholder;
  }
};
