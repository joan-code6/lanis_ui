import React from 'react';

export default function LandingImage({ src, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { src: string }) {
  return (
    <picture>
      <source type="image/webp" srcSet={src.replace('/landing/', '/landing/optimized/').replace(/\.png$/, '.webp')} />
      <img src={src} {...props} />
    </picture>
  );
}
