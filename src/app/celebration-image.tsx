"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";
import styles from "./home.module.css";

type CelebrationImageProps = ImageProps & {
  fallbackLabel: string;
  fallbackSrc: ImageProps["src"];
};

export default function CelebrationImage({
  alt,
  className,
  fallbackLabel,
  fallbackSrc,
  onError,
  ...imageProps
}: CelebrationImageProps) {
  const [unavailable, setUnavailable] = useState(false);
  const [fallbackUnavailable, setFallbackUnavailable] = useState(false);

  if (fallbackUnavailable) {
    return (
      <div className={styles.imageFallback} role="img" aria-label={alt}>
        <span>{fallbackLabel}</span>
      </div>
    );
  }

  return (
    <Image
      {...imageProps}
      src={unavailable ? fallbackSrc : imageProps.src}
      alt={alt}
      className={className}
      onError={(event) => {
        onError?.(event);
        if (unavailable) {
          setFallbackUnavailable(true);
        } else {
          setUnavailable(true);
        }
      }}
    />
  );
}
