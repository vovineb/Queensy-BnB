/**
 * Default desktop hero: Nyali Beach, Mombasa, at high tide.
 * CT Cooper, CC BY 3.0, via Wikimedia Commons. The licence requires the
 * credit shown in the hero (see MOMBASA_HERO.credit).
 */
const FILE = "Nyali_Beach_from_the_Reef_Hotel_during_high_tide_in_Mombasa%2C_Kenya_8.jpg";
const thumb = (width: number) => `https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/${FILE}/${width}px-${FILE}`;

export const MOMBASA_HERO = {
  src: thumb(1920),
  srcSet: `${thumb(1280)} 1280w, ${thumb(1920)} 1920w`,
  width: 1920,
  height: 1280,
  credit: {
    text: "Nyali Beach, Mombasa · Photo: CT Cooper, CC BY 3.0",
    href: "https://commons.wikimedia.org/wiki/File:Nyali_Beach_from_the_Reef_Hotel_during_high_tide_in_Mombasa,_Kenya_8.jpg",
  },
};
