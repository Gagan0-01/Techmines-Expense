import React from 'react';
import logoLight from '../../assets/logo/techmines-logo-light.png';
import logoDark from '../../assets/logo/techmines-logo-dark.png';

/**
 * TechMines brand mark.
 *
 * Renders the light-background and dark-background variants and lets the app's
 * existing `dark` class (set on <html> by ThemeContext / the inline script in
 * index.html) decide which one is visible. Both images are in the DOM, so
 * switching themes is instant: no re-render, no reload and no image flicker.
 * The hidden variant is display:none, so it is also ignored by screen readers.
 */
export const Logo = ({ className = '', alt = 'TechMines' }) => (
  <>
    <img
      src={logoLight}
      alt={alt}
      className={`block dark:hidden object-contain ${className}`}
      draggable="false"
    />
    <img
      src={logoDark}
      alt={alt}
      className={`hidden dark:block object-contain ${className}`}
      draggable="false"
    />
  </>
);

export default Logo;
