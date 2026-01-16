const museumBgSources = ['/img/gallery_room.png', '/img/gallery_dark.png'];

let museumBgPromise: Promise<void> | null = null;
let museumBgLoaded = false;

const preloadImage = (src: string) =>
  new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });

export const isMuseumBackgroundsReady = () => museumBgLoaded;

export const preloadMuseumBackgrounds = () => {
  if (museumBgLoaded) return Promise.resolve();
  if (!museumBgPromise) {
    museumBgPromise = Promise.all(museumBgSources.map(preloadImage)).then(() => {
      museumBgLoaded = true;
    });
  }
  return museumBgPromise;
};
