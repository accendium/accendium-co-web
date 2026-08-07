"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export type ProfileCardVariant = "dark" | "light";

/**
 * Every colour is spelled out per variant rather than left to the theme
 * tokens, so the card reads correctly on top of whichever background it is
 * layered over regardless of the document theme.
 */
const VARIANTS: Record<
  ProfileCardVariant,
  {
    card: string;
    logoSrc: string;
    logo: string;
    title: string;
    subtitle: string;
    closeButton: string;
    linkButton: string;
  }
> = {
  dark: {
    card: "border-white/20 bg-transparent",
    logoSrc: "/logo_white.svg",
    logo: "[filter:drop-shadow(0_0_8px_rgba(255,255,255,0.6))_drop-shadow(0_0_16px_rgba(255,255,255,0.35))]",
    title:
      "text-white [text-shadow:0_0_12px_rgba(255,255,255,0.5),0_0_24px_rgba(255,255,255,0.3)]",
    subtitle: "text-white/70",
    closeButton:
      "border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white focus-visible:ring-white/40",
    linkButton:
      "border-white/30 bg-transparent text-white hover:border-white hover:bg-white/10 hover:text-white focus-visible:ring-white/40",
  },
  light: {
    card: "border-black/10 bg-white/55",
    logoSrc: "/logo_dark.svg",
    logo: "[filter:drop-shadow(0_1px_3px_rgba(255,255,255,0.9))]",
    title: "text-neutral-900",
    subtitle: "text-neutral-700",
    closeButton:
      "border-black/15 bg-white/50 text-neutral-900 hover:bg-white/80 hover:text-neutral-900 focus-visible:ring-black/30",
    linkButton:
      "border-black/15 bg-white/50 text-neutral-900 hover:border-black/40 hover:bg-white/80 hover:text-neutral-900 focus-visible:ring-black/30",
  },
};

type ProfileCardProps = {
  links: Array<{
    name: string;
    url: string;
    icon: React.ElementType;
  }>;
  isCardOpen?: boolean;
  setIsCardOpen?: (open: boolean) => void;
  /** Colour scheme to render against the page background (default: dark). */
  variant?: ProfileCardVariant;
};

export default function ProfileCard({
  links,
  isCardOpen,
  setIsCardOpen,
  variant = "dark",
}: ProfileCardProps) {
  const styles = VARIANTS[variant];

  return (
    // The wrapper spans the viewport purely to centre the card, so it must not
    // swallow clicks meant for whatever sits behind it.
    <div className="relative z-10 min-h-screen flex items-center justify-center p-4 pointer-events-none">
      <Card
        data-foreground-component
        className={`w-full select-none max-w-md mx-auto backdrop-blur-lg rounded-2xl p-8 border shadow-2xl gap-0 ${styles.card}
           ${isCardOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        style={{
          opacity: isCardOpen ? 1 : 0,
          transition: "transform 300ms ease, opacity 180ms ease",
        }}
      >
        <CardHeader className="pb-4 pr-0">
          <CardTitle className="sr-only">Profile</CardTitle>
          <CardAction>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => setIsCardOpen?.(false)}
              className={styles.closeButton}
              aria-label="Close profile card"
            >
              <X size={16} />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-8 px-0">
          <div className="text-center">
            <div className="relative w-[120px] h-[120px] mx-auto mb-6">
              <Image
                src={styles.logoSrc}
                alt="Profile Picture"
                width={120}
                height={120}
                className={`rounded-none border-2 object-cover transition-colors duration-300 border-none ${styles.logo}`}
              />
            </div>
            <CardTitle
              className={`text-2xl font-sans mb-2 ${styles.title}`}
            >
              accendium.
            </CardTitle>
            <p className={`text-sm font-sans ${styles.subtitle}`}>
              developer and creator.
            </p>
          </div>

          <div className="space-y-3">
            {links.map((link, index) => {
              const IconComponent = link.icon;
              return (
                <Button
                  key={index}
                  variant="outline"
                  className={`w-full justify-center gap-3 py-3.5 px-6 rounded-xl backdrop-blur-sm hover:shadow-lg font-medium font-sans ${styles.linkButton}`}
                  asChild
                >
                  <Link
                    href={link.url}
                    aria-label={link.name}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <IconComponent className="w-5 h-5" />
                    {link.name}
                  </Link>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
