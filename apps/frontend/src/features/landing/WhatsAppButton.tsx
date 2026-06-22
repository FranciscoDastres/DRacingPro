import { whatsappLink } from '../../config/contact';

const DEFAULT_MESSAGE =
  'Hola, quiero hacer una consulta sobre el servicio para mi Honda NAVI.';

/**
 * Floating WhatsApp button for direct customer inquiries. Icon only; opens a
 * WhatsApp chat with the workshop number in a new tab.
 */
export function WhatsAppButton() {
  return (
    <a
      aria-label="Consultar por WhatsApp"
      className="fixed right-5 bottom-5 z-40 grid size-14 place-items-center rounded-full bg-[#25d366] text-white shadow-[0_12px_30px_rgba(37,211,102,.45)] transition hover:scale-105 hover:bg-[#20bd5a]"
      href={whatsappLink(DEFAULT_MESSAGE)}
      rel="noreferrer"
      target="_blank"
    >
      <WhatsAppIcon />
    </a>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      height="28"
      viewBox="0 0 24 24"
      width="28"
    >
      <path d="M17.47 14.38c-.3-.15-1.74-.86-2-.96-.27-.1-.46-.15-.65.15-.2.3-.75.96-.92 1.15-.17.2-.34.22-.63.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.14.3-.34.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.65-1.58-.9-2.16-.24-.57-.48-.5-.65-.5l-.56-.01c-.2 0-.5.07-.77.37-.26.3-1 .98-1 2.4 0 1.4 1.03 2.76 1.17 2.96.15.2 2.02 3.08 4.9 4.32.68.3 1.21.47 1.63.6.68.22 1.3.19 1.8.11.54-.08 1.66-.68 1.9-1.33.24-.66.24-1.22.17-1.33-.07-.12-.27-.2-.56-.34Zm-5.43 7.42h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26C2.6 6.74 6.86 2.5 12.07 2.5a9.5 9.5 0 0 1 6.77 2.8 9.5 9.5 0 0 1 2.8 6.78c0 5.21-4.26 9.45-9.59 9.45Zm8.18-17.63A11.43 11.43 0 0 0 12.06.5C5.85.5.8 5.55.8 11.76c0 1.99.52 3.93 1.5 5.64L.71 23.5l6.24-1.64a11.2 11.2 0 0 0 5.1 1.3h.01c6.21 0 11.26-5.05 11.26-11.26 0-3.01-1.17-5.84-3.3-7.97Z" />
    </svg>
  );
}
