
import { Question, GameCategory, Difficulty, UserSettings } from '../types';

const getRandomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getOperation = (): '+' | '-' => {
  return Math.random() < 0.5 ? '+' : '-';
};

export const calculateTimeLimit = (
  attempt: number,
  difficulty: Difficulty,
  category: GameCategory,
  userSettings?: UserSettings
): number => {

  // 1. Priority: User Custom Settings (if defined for this difficulty)
  if (userSettings?.customTimers && userSettings.customTimers[difficulty]) {
    const customTime = userSettings.customTimers[difficulty];
    if (customTime) return customTime;
  }

  // 2. Challenge mode dynamic time (Overrides custom settings usually, but we keep logic separate)
  if (category === 'challenge') {
    // Starts with 10s, adds 1s every 10 levels, capped at 15s
    return Math.min(15, 10 + Math.floor(attempt / 10));
  }

  // 3. Default Time Logic
  switch (difficulty) {
    case 'easy': return 10;
    case 'easy_medium': return 12;
    case 'medium': return 14;
    case 'medium_hard': return 16;
    case 'hard': return 18;
    case 'random_tables': return 12;
    default: return 14;
  }
};

export const generateQuestion = (attempt: number, category: GameCategory, difficulty: Difficulty = 'medium'): Question => {

  // --- CHALLENGE MODE LOGIC (Recursive) ---
  if (category === 'challenge') {
    let subCategory: GameCategory = 'addition';
    let subDifficulty: Difficulty = 'easy';

    // Progressive Difficulty based on question number (attempt 0 to 49)
    if (attempt < 10) {
      // Level 1 (Q 1-10): Easy Add/Sub
      subDifficulty = 'easy';
      subCategory = Math.random() < 0.5 ? 'addition' : 'subtraction';
    } else if (attempt < 20) {
      // Level 2 (Q 11-20): Easy-Medium, introduce Multiplication
      subDifficulty = 'easy_medium';
      const r = Math.random();
      if (r < 0.33) subCategory = 'addition';
      else if (r < 0.66) subCategory = 'subtraction';
      else subCategory = 'multiplication';
    } else if (attempt < 30) {
      // Level 3 (Q 21-30): Medium, introduce Division
      subDifficulty = 'medium';
      const r = Math.random();
      if (r < 0.25) subCategory = 'addition';
      else if (r < 0.5) subCategory = 'subtraction';
      else if (r < 0.75) subCategory = 'multiplication';
      else subCategory = 'division';
    } else if (attempt < 40) {
      // Level 4 (Q 31-40): Medium-Hard, introduce Mixed Operations
      subDifficulty = 'medium_hard';
      const r = Math.random();
      if (r < 0.2) subCategory = 'multiplication';
      else if (r < 0.4) subCategory = 'division';
      else if (r < 0.7) subCategory = 'mixed_add_sub';
      else subCategory = 'mixed_mult_add';
    } else {
      // Level 5 (Q 41-50): Hard, Expert Mixed
      subDifficulty = 'hard';
      const r = Math.random();
      if (r < 0.3) subCategory = 'mixed_mult_add';
      else if (r < 0.6) subCategory = 'all_mixed';
      else subCategory = 'division'; // Hard division
    }

    // Recursively call generateQuestion with the specific parameters
    return generateQuestion(attempt, subCategory, subDifficulty);
  }

  // --- ADDITION (SUMAS) ---
  if (category === 'addition') {
    switch (difficulty) {
      case 'easy': { // 1 digit + 1 digit
        const a = getRandomInt(1, 9);
        const b = getRandomInt(1, 9);
        return { text: `${a} + ${b}`, answer: a + b };
      }
      case 'easy_medium': { // 2 digits + 1 digit (Simple)
        const a = getRandomInt(10, 20);
        const b = getRandomInt(1, 9);
        return { text: `${a} + ${b}`, answer: a + b };
      }
      case 'medium': { // 2 digits + 2 digits (Moderate)
        const a = getRandomInt(10, 50);
        const b = getRandomInt(10, 50);
        return { text: `${a} + ${b}`, answer: a + b };
      }
      case 'medium_hard': { // 3 numbers of 1 digit
        const a = getRandomInt(1, 9);
        const b = getRandomInt(1, 9);
        const c = getRandomInt(1, 9);
        return { text: `${a} + ${b} + ${c}`, answer: a + b + c };
      }
      case 'hard': { // 3 numbers mixed (2 digits + 1 digit)
        const a = getRandomInt(10, 50);
        const b = getRandomInt(10, 50);
        const c = getRandomInt(1, 9);
        return { text: `${a} + ${b} + ${c}`, answer: a + b + c };
      }
    }
  }

  // --- SUBTRACTION (RESTAS) ---
  if (category === 'subtraction') {
    switch (difficulty) {
      case 'easy': { // Up to 10
        const a = getRandomInt(2, 10);
        const b = getRandomInt(1, a - 1);
        return { text: `${a} - ${b}`, answer: a - b };
      }
      case 'easy_medium': { // Up to 20
        const a = getRandomInt(10, 20);
        const b = getRandomInt(1, 9);
        return { text: `${a} - ${b}`, answer: a - b };
      }
      case 'medium': { // 2 digits - 1 digit (crossing 10 sometimes)
        const a = getRandomInt(20, 50);
        const b = getRandomInt(2, 9);
        return { text: `${a} - ${b}`, answer: a - b };
      }
      case 'medium_hard': { // 2 digits - 2 digits (simple)
        const a = getRandomInt(30, 99);
        const b = getRandomInt(10, Math.min(25, a - 1));
        return { text: `${a} - ${b}`, answer: a - b };
      }
      case 'hard': { // 2 digits - 2 digits (complex)
        const a = getRandomInt(50, 99);
        const b = getRandomInt(20, a - 10);
        return { text: `${a} - ${b}`, answer: a - b };
      }
    }
  }

  // --- MULTIPLICATION (TABLAS) ---
  if (category === 'multiplication') {
    switch (difficulty) {
      case 'easy': { // Tables 1, 2, 10
        const a = Math.random() < 0.33 ? 1 : Math.random() < 0.5 ? 2 : 10;
        const b = getRandomInt(1, 10);
        return { text: `${a} × ${b}`, answer: a * b };
      }
      case 'easy_medium': { // Tables 1-5
        const a = getRandomInt(2, 5);
        const b = getRandomInt(1, 10);
        return { text: `${a} × ${b}`, answer: a * b };
      }
      case 'medium': { // Tables 2-9
        const a = getRandomInt(2, 9);
        const b = getRandomInt(2, 10);
        return { text: `${a} × ${b}`, answer: a * b };
      }
      case 'medium_hard': { // Tables 2-12
        const a = getRandomInt(6, 12);
        const b = getRandomInt(3, 10);
        return { text: `${a} × ${b}`, answer: a * b };
      }
      case 'hard': { // 2 digit x 1 digit
        const a = getRandomInt(12, 20);
        const b = getRandomInt(3, 9);
        return { text: `${a} × ${b}`, answer: a * b };
      }
      case 'random_tables': { // Full random 1-12
        const a = getRandomInt(1, 12);
        const b = getRandomInt(1, 12);
        return { text: `${a} × ${b}`, answer: a * b };
      }
    }
  }

  // --- DIVISION ---
  if (category === 'division') {
    // Generate multiplication and flip it
    switch (difficulty) {
      case 'easy': {
        const divisor = getRandomInt(2, 3);
        const quotient = getRandomInt(2, 5);
        const dividend = divisor * quotient;
        return { text: `${dividend} ÷ ${divisor}`, answer: quotient };
      }
      case 'easy_medium': {
        const divisor = getRandomInt(2, 5);
        const quotient = getRandomInt(2, 10);
        const dividend = divisor * quotient;
        return { text: `${dividend} ÷ ${divisor}`, answer: quotient };
      }
      case 'medium': {
        const divisor = getRandomInt(3, 9);
        const quotient = getRandomInt(3, 9);
        const dividend = divisor * quotient;
        return { text: `${dividend} ÷ ${divisor}`, answer: quotient };
      }
      case 'medium_hard': {
        const divisor = getRandomInt(4, 12);
        const quotient = getRandomInt(4, 12);
        const dividend = divisor * quotient;
        return { text: `${dividend} ÷ ${divisor}`, answer: quotient };
      }
      case 'hard': {
        const divisor = getRandomInt(5, 15);
        const quotient = getRandomInt(5, 20);
        const dividend = divisor * quotient;
        return { text: `${dividend} ÷ ${divisor}`, answer: quotient };
      }
    }
  }

  // --- NEW CATEGORY: SUMAS Y RESTAS (COMBINADAS) ---
  if (category === 'mixed_add_sub') {
    let text = "";
    let ans = -1;
    let attempts = 0;

    while (ans < 0 && attempts < 100) {
      attempts++;
      let a, b, c;
      const op1 = getOperation();
      const op2 = getOperation();

      let maxVal = 10;
      if (difficulty === 'easy') maxVal = 5;
      else if (difficulty === 'easy_medium') maxVal = 10;
      else if (difficulty === 'medium') maxVal = 20;
      else if (difficulty === 'medium_hard') maxVal = 50;
      else maxVal = 100;

      a = getRandomInt(2, maxVal);
      b = getRandomInt(1, difficulty === 'easy' ? a : maxVal);
      c = getRandomInt(1, maxVal);

      let intermediate = 0;
      if (op1 === '+') intermediate = a + b;
      else intermediate = a - b;

      if (op2 === '+') ans = intermediate + c;
      else ans = intermediate - c;

      text = `${a} ${op1} ${b} ${op2} ${c}`;

      if (difficulty === 'easy' && intermediate < 0) ans = -1;
    }
    return { text, answer: ans };
  }

  // --- NEW CATEGORY: MULT + SIMPLE OPS ---
  if (category === 'mixed_mult_add') {
    let a, b, c, ans;
    const op = getOperation();

    if (difficulty === 'easy' || difficulty === 'easy_medium') {
      a = getRandomInt(1, 5);
      b = getRandomInt(1, 5);
      c = getRandomInt(1, 10);
    } else if (difficulty === 'medium') {
      a = getRandomInt(2, 9);
      b = getRandomInt(2, 9);
      c = getRandomInt(1, 20);
    } else {
      a = getRandomInt(3, 12);
      b = getRandomInt(2, 10);
      c = getRandomInt(1, 50);
    }

    if (op === '+') {
      ans = (a * b) + c;
      return { text: `${a} × ${b} + ${c}`, answer: ans };
    } else {
      if (c > (a * b)) c = getRandomInt(1, (a * b) - 1);
      ans = (a * b) - c;
      return { text: `${a} × ${b} - ${c}`, answer: ans };
    }
  }

  // --- NEW CATEGORY: ALL MIXED (EXPERTO) ---
  if (category === 'all_mixed') {
    const type = Math.random();

    if (type < 0.5) {
      const c = getRandomInt(2, difficulty === 'hard' ? 9 : 5);
      const res = getRandomInt(2, difficulty === 'hard' ? 12 : 5);
      const product = c * res;

      let a = 1, b = product;
      for (let i = Math.floor(Math.sqrt(product)); i >= 1; i--) {
        if (product % i === 0) {
          a = i;
          b = product / i;
          break;
        }
      }
      return { text: `${a} × ${b} ÷ ${c}`, answer: res };
    } else {
      const c = getRandomInt(2, 5);
      const b = getRandomInt(2, 5);
      const a = getRandomInt(1, 20);
      const op = getOperation();

      if (op === '+') {
        return { text: `${a} + ${b} × ${c}`, answer: a + (b * c) };
      } else {
        let bigA = a;
        if (bigA < (b * c)) bigA = (b * c) + getRandomInt(1, 10);
        return { text: `${bigA} - ${b} × ${c}`, answer: bigA - (b * c) };
      }
    }
  }

  return { text: "1 + 1", answer: 2 };
};
