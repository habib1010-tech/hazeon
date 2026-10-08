// HAZEON "HZ" monogram, traced from the official logo artwork.
// Coordinates are in a 700 x 860 image space (y grows downward).
// "dark" pieces are the navy letterforms, "light" pieces are the shaded faces.
export const HZ_VIEWBOX = { width: 700, height: 860 };

export const HZ_PIECES = [
  {
    id: 'h',
    tone: 'dark',
    points: [[163, 134], [55, 198], [55, 660], [165, 724], [166, 484], [294, 480], [294, 374], [167, 370]],
  },
  {
    id: 'h-shade',
    tone: 'light',
    points: [[298, 190], [404, 250], [406, 364], [298, 546]],
  },
  {
    id: 'z',
    tone: 'dark',
    points: [[348, 26], [297, 56], [297, 120], [527, 256], [297, 650], [297, 800], [352, 832], [407, 800], [407, 677], [642, 284], [642, 202]],
  },
  {
    id: 'z-shade',
    tone: 'light',
    points: [[407, 678], [638, 540], [638, 658], [407, 795]],
  },
];

// Bounding box of the artwork, used to center the mark.
export const HZ_BOUNDS = { minX: 55, maxX: 642, minY: 26, maxY: 832 };

export function piecePath(points) {
  return 'M' + points.map(([x, y]) => `${x} ${y}`).join(' L') + ' Z';
}
