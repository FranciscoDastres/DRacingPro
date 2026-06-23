import { type ReactNode } from 'react';

import { CONTACT } from '../../config/contact';
import { BrandLogo } from './BrandLogo';

/**
 * Full-width utility bar at the very top of the landing, on a light background:
 * the (placeholder) logo on the far left and, on the far right, social links,
 * the contact phone and the attention hours — using the full width.
 */
export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <div className="border-b border-black/10 bg-white text-[#1a1a1a]">
      <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center px-5 sm:px-8 lg:px-12">
        <button
          aria-label="Abrir menú"
          className="grid size-10 place-items-center justify-self-start rounded-lg border border-black/10 text-[#1a1a1a] transition hover:border-black/30 hover:bg-black/5"
          onClick={onMenuClick}
          type="button"
        >
          <MenuIcon />
        </button>

        <a aria-label="Inicio" className="justify-self-center" href="#top">
          <BrandLogo />
        </a>

        <div className="flex items-center justify-end gap-5 sm:gap-8">
          <div className="flex items-center gap-2">
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
            <span className="block text-[11px] font-semibold tracking-[0.14em] text-[#6a6a6a] uppercase">
              Contáctanos
            </span>
            <span className="block text-sm font-bold">
              {CONTACT.phoneDisplay}
            </span>
          </a>

          <div className="hidden border-l border-black/10 pl-5 text-right sm:pl-8 md:block">
            <span className="block text-[11px] font-semibold tracking-[0.14em] text-[#6a6a6a] uppercase">
              Horario de atención
            </span>
            <span className="block text-sm font-bold">
              {CONTACT.hours.weekday}
            </span>
            <span className="block text-xs font-semibold text-[#6a6a6a]">
              {CONTACT.hours.saturday}
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
      className="grid size-9 place-items-center rounded-full border border-black/10 text-[#1a1a1a] transition hover:border-black/30 hover:bg-black/5"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {children}
    </a>
  );
}

function MenuIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="18"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="18"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      height="17"
      viewBox="0 0 24 24"
      width="17"
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
      height="17"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="17"
    >
      <rect height="18" rx="5" ry="5" width="18" x="3" y="3" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="17.5" cy="6.5" fill="currentColor" r="1" stroke="none" />
    </svg>
  );
}
