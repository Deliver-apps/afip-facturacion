import { logger } from '../logger';

export function getRandomNumberBetween(min: number, max: number): number {
  const random = Math.random() * (max - min) + min;
  return Math.round(random * 100) / 100; // Rounds to two decimal places
}

export function divideNumberRandomly(
  numberRandom: number,
  N: number,
  maxPart: number = 110000
): number[] {
  // Calculate the minimum possible part (so all parts sum up to the numberRandom)
  const minPart = parseFloat((numberRandom / N).toFixed(2));

  // If minPart is greater than maxPart, it's not possible to divide
  if (minPart > maxPart) {
    throw new Error(
      "It's not possible to divide ${numberRandom} into ${N} parts with each part <= ${maxPart}"
    );
  }

  let parts: number[] = [];
  let sum = 0;

  for (let i = 0; i < N; i++) {
    const remaining = numberRandom - sum;
    // Limit the max possible part to not exceed maxPart or the remaining amount divided evenly
    const maxPossiblePart = Math.min(
      maxPart,
      parseFloat((remaining / (N - i)).toFixed(2))
    );
    // Generate a random part between 0 and maxPossiblePart
    const part = parseFloat((Math.random() * maxPossiblePart).toFixed(2));
    parts.push(part);
    sum += part;
  }

  // Calculate the difference (or excess) between numberRandom and the sum of parts
  let excess = parseFloat((numberRandom - sum).toFixed(2));

  // While there is excess, keep redistributing it randomly across the parts
  while (excess !== 0) {
    for (let i = 0; i < parts.length && excess !== 0; i++) {
      const remainingExcess = Math.min(maxPart - parts[i], excess);
      // Add random part of the excess to each part without exceeding maxPart
      const addition = parseFloat((Math.random() * remainingExcess).toFixed(2));
      if (parts[i] + addition <= maxPart) {
        parts[i] += addition;
        excess -= addition;
        excess = parseFloat(excess.toFixed(2)); // Ensure no floating-point issues
      }
    }
  }

  if (parts.some((part) => part > maxPart)) {
    logger.warn(
      `Excess ${excess} after distributing ${numberRandom} into ${N} parts`
    );
    throw new Error(
      'Excess ${excess} after distributing ${numberRandom} into ${N} parts'
    );
  }

  return parts.map((part) => parseFloat(part.toFixed(2))); // Rounds to two decimal places
}

export function sumParts(parts: number[]): number {
  return parseFloat(parts.reduce((acc, part) => acc + part, 0).toFixed(2));
}
