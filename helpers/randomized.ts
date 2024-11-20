import { logger } from '../logger';

export function getRandomNumberBetween(min: number, max: number): number {
  const random = Math.random() * (max - min) + min;
  return Math.round(random * 100) / 100; // Rounds to two decimal places
}

export function divideNumberRandomly(
  numberRandom: number,
  N: number,
  minPart: number = 35000,
  maxPart: number = 135000
): number[] {
  // Calculate the average part to check feasibility
  const averagePart = parseFloat((numberRandom / N).toFixed(2));

  // Check if it's possible to divide the number with given minPart and maxPart
  if (averagePart > maxPart) {
    throw new Error(
      `It's not possible to divide ${numberRandom} into ${N} parts with each part <= ${maxPart}`
    );
  }

  if (averagePart < minPart) {
    console.table(averagePart);
    throw new Error(
      `It's not possible to divide ${numberRandom} into ${N} parts with each part >= ${minPart}`
    );
  }

  let parts: number[] = [];
  let sum = 0;

  for (let i = 0; i < N; i++) {
    const remaining = numberRandom - sum;

    // Calculate the min and max possible part for this iteration
    const minPossiblePart = Math.max(
      minPart,
      parseFloat(
        (remaining - maxPart * (N - i - 1) > minPart
          ? remaining - maxPart * (N - i - 1)
          : minPart
        ).toFixed(2)
      )
    );

    const maxPossiblePart = Math.min(
      maxPart,
      parseFloat(
        (remaining - minPart * (N - i - 1) < maxPart
          ? remaining - minPart * (N - i - 1)
          : maxPart
        ).toFixed(2)
      )
    );

    if (minPossiblePart > maxPossiblePart) {
      throw new Error(
        `Cannot allocate parts with minPart ${minPart} and maxPart ${maxPart} for remaining ${remaining}`
      );
    }

    // Generate a random part between minPossiblePart and maxPossiblePart
    const part = parseFloat(
      (
        Math.random() * (maxPossiblePart - minPossiblePart) +
        minPossiblePart
      ).toFixed(2)
    );

    parts.push(part);
    sum += part;
  }

  // Adjust for any rounding errors
  let difference = parseFloat((numberRandom - sum).toFixed(2));

  if (difference !== 0) {
    parts[parts.length - 1] += difference;
  }

  // Validate that all parts are within minPart and maxPart
  if (parts.some((part) => part < minPart || part > maxPart)) {
    throw new Error('Some parts are out of bounds after distribution');
  }

  return parts.map((part) => parseFloat(part.toFixed(2))); // Rounds to two decimal places
}

export function sumParts(parts: number[]): number {
  return parseFloat(parts.reduce((acc, part) => acc + part, 0).toFixed(2));
}
