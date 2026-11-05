/** Joins class names, skipping falsy values. */
export const cn = (...classes) => classes.flat().filter(Boolean).join(' ');
