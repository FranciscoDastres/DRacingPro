import { type ReactNode } from 'react';

import { CONTACT } from '../../config/contact';
import { BrandLogo } from './BrandLogo';

/**
 * Slim utility bar at the very top of the landing: a (placeholder) logo centred,
 * with social links, contact phone and attention hours on the right.
 */
export function TopBar() {
  return (
    <div className="border-b border-white/10 bg-[#0a0a0a]">
      <div className="mx-auto grid h-12 max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6 lg:px-10">
        <span aria-hidden="true" />

        <a aria-label="Inicio" className="justify-self-center" href="#top">
          <BrandLogo />
        </a>

        <div className="flex items-center justify-end gap-3 sm:gap-5">
          <div className="flex items-center gap-1.5">
            <SocialLink href={CONTACT.social.facebook} label="Facebook">
              <FacebookIcon />
            </SocialLink>
            <SocialLink href={CONTACT.social.instagram} label="Instagram">
              <InstagramIcon />
            </SocialLink>
          </div>

          <a
            className="hidden text-right sm:block"
            href={`tel:${CONTACT.whatsappNumber}`}
          >
            <span className="text-muted block text-[10px] font-semibold tracking-[0.14em] uppercase">
              Contáctanos
            </span>
            <span className="text-foreground block text-xs font-bold">
              {CONTACT.phoneDisplay}
            </span>
          </a>

          <div className="hidden border-l border-white/10 pl-5 text-right md:block">
            <span className="text-muted block text-[10px] font-semibold tracking-[0.14em] uppercase">
              Horario de atención
            </span>
            <span className="text-foreground block text-xs font-bold">
              {CONTACT.hours}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SocialLink({
  children,
  href,
  label,
}: {
  children: ReactNode;
  href: string;
  label: string;
}) {
  return (
    <a
      aria-label={`Síguenos en ${label}`}
      className="text-muted hover:text-foreground grid size-8 place-items-center rounded-full border border-white/10 transition hover:border-white/30"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {children}
    </a>
  );
}

function FacebookIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      height="15"
      viewBox="0 0 24 24"
      width="15"
    >
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="15"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="15"
    >
      <rect height="18" rx="5" ry="5" width="18" x="3" y="3" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="17.5" cy="6.5" fill="currentColor" r="1" stroke="none" />
    </svg>
  );
}
