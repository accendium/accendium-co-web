"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type ProfileCardProps = {
  links: Array<{
    name: string;
    url: string;
    icon: React.ElementType;
  }>;
  isCardOpen?: boolean;
  setIsCardOpen?: (open: boolean) => void;
};

export default function ProfileCard({
  links,
  isCardOpen,
  setIsCardOpen,
}: ProfileCardProps) {
  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
      <Card
        data-foreground-component
        className={`w-full select-none max-w-md mx-auto backdrop-blur-xl rounded-[2rem] p-8 border shadow-[0_24px_80px_rgba(244,114,182,0.24)] border-pink-100/70 bg-white/45 gap-0
           ${isCardOpen ? "" : "pointer-events-none"}`}
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
              className="border-pink-200/80 bg-white/60 text-pink-500 hover:bg-pink-100 hover:text-pink-600"
              aria-label="Close profile card"
            >
              <Heart size={16} className="fill-current" />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-8 px-0">
          <div className="text-center">
            <div className="relative w-[120px] h-[120px] mx-auto mb-6">
              <Image
                src="/logo_pink.svg"
                alt="Profile Picture"
                width={120}
                height={120}
                className="object-contain transition-colors duration-300 [filter:drop-shadow(0_0_10px_rgba(255,255,255,0.85))_drop-shadow(0_0_22px_rgba(244,114,182,0.45))]"
              />
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.35em] text-pink-400/80">
              cutesy girly pop
            </p>
            <CardTitle className="text-3xl font-sans text-pink-700 mb-2 [text-shadow:0_0_24px_rgba(255,255,255,0.85)]">
              accendium.
            </CardTitle>
            <p className="text-sm font-sans text-pink-700/75">
              developer, dreamer, and creator.
            </p>
          </div>

          <div className="space-y-3">
            {links.map((link, index) => {
              return (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full justify-center gap-3 py-3.5 px-6 rounded-full backdrop-blur-sm border-pink-200/80 bg-white/65 text-pink-700 hover:border-pink-300 hover:bg-pink-100/85 hover:text-pink-800 hover:shadow-[0_10px_30px_rgba(244,114,182,0.16)] font-medium font-sans"
                  asChild
                >
                  <Link
                    href={link.url}
                    aria-label={link.name}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Heart className="w-5 h-5 fill-current" />
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
