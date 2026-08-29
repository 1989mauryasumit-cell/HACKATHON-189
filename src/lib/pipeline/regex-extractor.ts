export interface RegexMention {
  text: string;
  type: 'phone' | 'vehicle' | 'bank_account' | 'event' | 'email';
  charStart: number;
  charEnd: number;
  attributes: Record<string, any>;
}

export function extractDeterministicRegex(text: string): RegexMention[] {
  const mentions: RegexMention[] = [];

  // 1. Indian Phone Numbers
  const phoneRegex = /(?:\+91[\s-]?)?[6789]\d{4}[\s-]?\d{5}/g;
  let match;
  while ((match = phoneRegex.exec(text)) !== null) {
    mentions.push({
      text: match[0],
      type: 'phone',
      charStart: match.index,
      charEnd: phoneRegex.lastIndex,
      attributes: { raw: match[0] }
    });
  }

  // 2. Indian Vehicle Registration Plates (e.g. DL-1C-AA-9999, MH-12-BB-8888, GJ01XX1111)
  const vehicleRegex = /\b[A-Z]{2}[\s-]?\d{2}[\s-]?[A-Z]{1,2}[\s-]?\d{4}\b/g;
  while ((match = vehicleRegex.exec(text)) !== null) {
    mentions.push({
      text: match[0],
      type: 'vehicle',
      charStart: match.index,
      charEnd: vehicleRegex.lastIndex,
      attributes: { raw: match[0] }
    });
  }

  // 3. Bank Account Numbers & IFSC codes
  // IFSC Code: SBIN0001234, HDFC0001001
  const ifscRegex = /\b[A-Z]{4}0[A-Z0-9]{6}\b/g;
  const ifsccodes: { code: string; index: number; end: number }[] = [];
  while ((match = ifscRegex.exec(text)) !== null) {
    ifsccodes.push({ code: match[0], index: match.index, end: ifscRegex.lastIndex });
  }

  // Standard Bank Account: 9 to 18 digits (avoiding overlapping phone numbers or zip codes)
  const bankAccountRegex = /\b\d{9,18}\b/g;
  while ((match = bankAccountRegex.exec(text)) !== null) {
    const matchedStr = match[0];
    
    // Check if this digit group is actually a phone number (e.g. starting with +91 or 10 digits starting with 7,8,9)
    const isPhone = /^[789]\d{9}$/.test(matchedStr) || mentions.some(m => m.text.includes(matchedStr));
    if (isPhone) continue;

    // Associate near IFSC code if possible
    let associatedIfsc = "";
    for (const codeObj of ifsccodes) {
      const distance = Math.abs(match.index - codeObj.index);
      if (distance < 60) {
        associatedIfsc = codeObj.code;
        break;
      }
    }

    mentions.push({
      text: matchedStr,
      type: 'bank_account',
      charStart: match.index,
      charEnd: bankAccountRegex.lastIndex,
      attributes: {
        account_number: matchedStr,
        ifsc: associatedIfsc || undefined
      }
    });
  }

  // 4. Dates & Times (extracted as events)
  const dateRegex = /\b\d{2}[-\/\.]\d{2}[-\/\.]\d{4}\b|\b\d{4}[-\/\.]\d{2}[-\/\.]\d{2}\b/g;
  while ((match = dateRegex.exec(text)) !== null) {
    mentions.push({
      text: match[0],
      type: 'event',
      charStart: match.index,
      charEnd: dateRegex.lastIndex,
      attributes: { date: match[0], event_type: 'timestamp' }
    });
  }

  // 5. Emails
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  while ((match = emailRegex.exec(text)) !== null) {
    mentions.push({
      text: match[0],
      type: 'email',
      charStart: match.index,
      charEnd: emailRegex.lastIndex,
      attributes: { email: match[0] }
    });
  }

  return mentions;
}
