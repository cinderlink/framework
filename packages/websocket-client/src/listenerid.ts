import { base64 } from 'multiformats/bases/base64';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function shiftUint8Array(bytes: Uint8Array, shift: Uint8Array) {
  const shifted = new Uint8Array(bytes.length);
  const shiftOverflow: [number, number][] = [];
  for (let i = 0; i < bytes.length; i++) {
    // offset each byte by the corresponding byte in the shift
    shifted[i] = bytes[i] + shift[i % shift.length];
    // if the offset is greater than 255, we need to carry the overflow
    if (shifted[i] > 256) {
      shiftOverflow.push([i, shifted[i] - 256]);
    }
  }
  // prepepnd a header describing the overflow
  const overflowBytes = new Uint8Array(shiftOverflow.length * 2 + 1);
  overflowBytes[0] = shiftOverflow.length;
  for (let i = 0; i < shiftOverflow.length; i++) {
    const [index, overflow] = shiftOverflow[i];
    overflowBytes[i * 2 + 1] = index;
    overflowBytes[i * 2 + 2] = overflow;
  }
  const shiftedWithOverflow = new Uint8Array(
    shifted.length + overflowBytes.length,
  );
  shiftedWithOverflow.set(overflowBytes);
  shiftedWithOverflow.set(shifted, overflowBytes.length);
  return shiftedWithOverflow;
}

export function unshiftUint8Array(shifted: Uint8Array, shift: Uint8Array) {
  const overflowLength = shifted[0];
  const overflowBytes = shifted.slice(1, overflowLength * 2 + 1);
  const mods: Record<number, number> = [];
  for (let i = 0; i < overflowLength; i++) {
    const index = overflowBytes[i * 2 + 1];
    const overflow = overflowBytes[i * 2 + 2];
    mods[index] = overflow;
  }
  const shiftedBytes = shifted.slice(overflowLength * 2 + 1);
  const unshifted = new Uint8Array(shiftedBytes.length);
  for (let i = 0; i < shiftedBytes.length; i++) {
    const mod = mods[i] || 0;
    unshifted[i] = (shiftedBytes[i] - shift[i % shift.length] - mod) % 256;
  }
  return unshifted;
}

export function shiftText(source: string, shift: string) {
  const sourceBytes = encoder.encode(source);
  const shiftBytes = encoder.encode(shift);
  const shifted = shiftUint8Array(sourceBytes, shiftBytes);
  return base64.encode(shifted);
}

export function unshiftText(shifted: string, shift: string) {
  const shiftedBytes = base64.decode(shifted);
  const shiftBytes = encoder.encode(shift);
  const unshifted = unshiftUint8Array(shiftedBytes, shiftBytes);
  return decoder.decode(unshifted);
}

export function createListenerId(uris: string[], address = '') {
  return shiftText(uris.join(','), address);
}

export function decodeListenerId(listenerId: string, address = '') {
  return unshiftText(listenerId, address).split(',');
}
