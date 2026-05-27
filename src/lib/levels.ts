/** Sistema de niveles basado en XP. Cada nivel cuesta 100 XP más que el anterior.
 *  Nivel 1: 0-100 XP, Nivel 2: 100-300, Nivel 3: 300-600, etc. */
export function levelFromXp(xp: number) {
  // Resolver n: xp >= 50*n*(n-1)  → n = (1 + sqrt(1 + 8*xp/50))/2
  const n = Math.floor((1 + Math.sqrt(1 + (8 * xp) / 50)) / 2);
  const level = Math.max(1, n);
  const xpForCurrent = 50 * (level - 1) * level;
  const xpForNext = 50 * level * (level + 1);
  const into = xp - xpForCurrent;
  const span = xpForNext - xpForCurrent;
  return {
    level,
    xp,
    xpIntoLevel: into,
    xpForNextLevel: span,
    progress: Math.min(1, into / span),
    title: titleForLevel(level),
  };
}

function titleForLevel(n: number) {
  if (n >= 20) return "Leyenda de Lima";
  if (n >= 12) return "Embajador";
  if (n >= 8)  return "Local Pro";
  if (n >= 5)  return "Explorador";
  if (n >= 3)  return "Curioso";
  return "Recién llegado";
}