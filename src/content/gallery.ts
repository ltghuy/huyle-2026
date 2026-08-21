export interface GalleryImage {
  src: string;
  alt: string;
}

/**
 * Photos for the "Off the clock" globe. Add or remove entries freely — the
 * globe distributes however many you give it around the sphere (repeating to
 * fill) and reflows to any count.
 */
export const galleryImages: GalleryImage[] = [
  { src: "/assets/gallery/01_gym_time.png", alt: "At the gym, mid-set" },
  { src: "/assets/gallery/02_photography.png", alt: "Out shooting, chasing the light" },
  { src: "/assets/gallery/03_cat_companion.png", alt: "Bông the tuxedo cat, supervising" },
  { src: "/assets/gallery/04_coffee_recharge.png", alt: "Coffee break — recharging" },
];
