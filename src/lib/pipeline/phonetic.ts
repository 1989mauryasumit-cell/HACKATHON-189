export function metaphone(word: string): string {
  if (!word) return "";
  let txt = word.toUpperCase().replace(/[^A-Z]/g, "");
  if (txt.length === 0) return "";

  // Remove duplicate adjacent characters
  let cleanTxt = txt[0];
  for (let i = 1; i < txt.length; i++) {
    if (txt[i] !== txt[i - 1]) {
      cleanTxt += txt[i];
    }
  }
  txt = cleanTxt;

  // Simplified Soundex/Metaphone hybrid for Indian Names
  // 1. Initial letters adjustments
  if (txt.startsWith("KN") || txt.startsWith("GN") || txt.startsWith("PN") || txt.startsWith("WR")) {
    txt = txt.slice(1);
  } else if (txt.startsWith("X")) {
    txt = "S" + txt.slice(1);
  }

  const result: string[] = [];

  for (let i = 0; i < txt.length; i++) {
    const char = txt[i];
    const next = txt[i + 1] || "";
    const prev = txt[i - 1] || "";

    switch (char) {
      case 'A':
      case 'E':
      case 'I':
      case 'O':
      case 'U':
        // Keep vowel only at start
        if (i === 0) result.push('A');
        break;

      case 'B':
        result.push('B');
        break;

      case 'C':
        if (next === 'H') {
          result.push('X'); // CH -> X (sh sound)
          i++;
        } else if (['E', 'I', 'Y'].includes(next)) {
          result.push('S');
        } else {
          result.push('K');
        }
        break;

      case 'D':
        if (next === 'G') {
          result.push('J');
          i++;
        } else {
          result.push('T'); // Group D/T
        }
        break;

      case 'F':
        result.push('F');
        break;

      case 'G':
        if (next === 'H') {
          // silent at end, else F
          if (i + 1 < txt.length - 1) {
            result.push('F');
          }
          i++;
        } else if (['E', 'I', 'Y'].includes(next)) {
          result.push('J');
        } else {
          result.push('K'); // G/K grouping
        }
        break;

      case 'H':
        // Keep H only if at start or after vowel
        if (i === 0 || ['A', 'E', 'I', 'O', 'U'].includes(prev)) {
          result.push('H');
        }
        break;

      case 'J':
        result.push('J');
        break;

      case 'K':
        result.push('K');
        break;

      case 'L':
        result.push('L');
        break;

      case 'M':
        result.push('M');
        break;

      case 'N':
        result.push('N');
        break;

      case 'P':
        if (next === 'H') {
          result.push('F'); // PH -> F
          i++;
        } else {
          result.push('P');
        }
        break;

      case 'Q':
        result.push('K');
        break;

      case 'R':
        result.push('R');
        break;

      case 'S':
        if (next === 'H') {
          result.push('X'); // SH -> X
          i++;
        } else {
          result.push('S');
        }
        break;

      case 'T':
        if (next === 'H') {
          result.push('T');
          i++;
        } else {
          result.push('T');
        }
        break;

      case 'V':
      case 'W':
        result.push('F'); // Group V/W -> F (Indian transliteration mapping)
        break;

      case 'X':
        result.push('K');
        result.push('S');
        break;

      case 'Y':
        if (i === 0) result.push('Y');
        break;

      case 'Z':
        result.push('S');
        break;
    }
  }

  return result.join("").slice(0, 6);
}
