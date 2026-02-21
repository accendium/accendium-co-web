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
        className={`w-full max-w-md mx-auto backdrop-blur-lg rounded-2xl p-8 border shadow-2xl border-white/20 bg-transparent gap-0
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
              className="border-white/20 text-white hover:bg-white/10 hover:text-white"
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
                src="/logo_white.svg"
                alt="Profile Picture"
                width={120}
                height={120}
                className="rounded-none border-2 object-cover shadow-lg transition-colors duration-300 border-none"
              />
            </div>
            <CardTitle className="text-2xl font-sans text-white mb-2">
              accendium.
            </CardTitle>
            <p className="text-sm font-sans text-white/70">
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
                  className="w-full justify-center gap-3 py-3.5 px-6 rounded-xl backdrop-blur-sm border-white/30 text-white hover:border-white hover:bg-white/10 hover:text-white hover:shadow-lg font-medium font-sans"
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
