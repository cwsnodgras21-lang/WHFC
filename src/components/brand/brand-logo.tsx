"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import {
  APP_SHORT_NAME,
  BRAND_LOGO_PATH,
  PRODUCT_DESCRIPTOR,
} from "@/lib/constants";
import { cn } from "@/lib/cn";

type BrandLogoProps = {
  className?: string;
  variant?: "sidebar" | "auth";
  /** From server when public/branding/whfc-logo.png exists */
  logoAvailable?: boolean;
};

export function BrandLogo({
  className,
  variant = "sidebar",
  logoAvailable: logoAvailableProp = false,
}: BrandLogoProps) {
  const [detectedLogo, setDetectedLogo] = useState(false);

  useEffect(() => {
    if (logoAvailableProp) {
      return;
    }

    const img = new window.Image();
    img.onload = () => setDetectedLogo(true);
    img.onerror = () => setDetectedLogo(false);
    img.src = BRAND_LOGO_PATH;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [logoAvailableProp]);

  const showLogo = logoAvailableProp || detectedLogo;

  return (
    <div
      className={cn(
        "brand-lockup",
        variant === "auth" && "brand-lockup--auth",
        className
      )}
    >
      {showLogo ? (
        <div
          className={cn(
            "brand-logo-image",
            variant === "sidebar"
              ? "brand-logo-image--sidebar"
              : "brand-logo-image--auth"
          )}
        >
          <Image
            src={BRAND_LOGO_PATH}
            alt="White House Family Care"
            fill
            className={cn(
              "object-contain",
              variant === "sidebar" ? "object-left" : "object-center"
            )}
            sizes={variant === "sidebar" ? "184px" : "224px"}
            priority
          />
        </div>
      ) : (
        <p className="brand-lockup-title">
          {APP_SHORT_NAME}
          <span className="sr-only"> — White House Family Care</span>
        </p>
      )}

      <p className="brand-lockup-descriptor">{PRODUCT_DESCRIPTOR}</p>
    </div>
  );
}
