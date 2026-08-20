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
  { src: "/assets/gallery/evan.jpg", alt: "Portrait of Huy" },
  { src: "/assets/gallery/bong-1.jpg", alt: "Bông, the tuxedo cat" },
  { src: "/assets/gallery/bong-2.jpg", alt: "Bông, the tuxedo cat" },
  { src: "/assets/gallery/bong-3.jpg", alt: "Bông, the tuxedo cat" },
];
