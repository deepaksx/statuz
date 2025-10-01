/**
 * WhatsApp Chat Parser
 * Parses exported WhatsApp chat text files
 */

export interface ParsedMessage {
  timestamp: number;
  author: string;
  authorName: string;
  text: string;
}

export function parseWhatsAppChat(content: string): ParsedMessage[] {
  const messages: ParsedMessage[] = [];
  const lines = content.split('\n');

  // WhatsApp export formats:
  // [DD/MM/YYYY, HH:MM:SS] Author: Message
  // DD/MM/YYYY, HH:MM - Author: Message
  // M/D/YY, H:MM AM/PM - Author: Message

  const messageRegex = /^[\[]?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\]?\s*[-–]\s*([^:]+?):\s*(.*)$/i;

  let currentMessage: ParsedMessage | null = null;

  for (const line of lines) {
    const match = line.match(messageRegex);

    if (match) {
      // Save previous message if exists
      if (currentMessage) {
        messages.push(currentMessage);
      }

      const [, dateStr, timeStr, authorName, text] = match;

      // Parse date and time
      const timestamp = parseWhatsAppDateTime(dateStr, timeStr);

      currentMessage = {
        timestamp,
        author: authorName.trim(),
        authorName: authorName.trim(),
        text: text.trim()
      };
    } else if (currentMessage && line.trim()) {
      // Continuation of previous message (multi-line)
      currentMessage.text += '\n' + line;
    }
  }

  // Don't forget the last message
  if (currentMessage) {
    messages.push(currentMessage);
  }

  return messages;
}

function parseWhatsAppDateTime(dateStr: string, timeStr: string): number {
  // Clean up strings
  dateStr = dateStr.trim();
  timeStr = timeStr.trim();

  // Handle different date formats
  let dateParts: string[];
  if (dateStr.includes('/')) {
    dateParts = dateStr.split('/');
  } else if (dateStr.includes('-')) {
    dateParts = dateStr.split('-');
  } else if (dateStr.includes('.')) {
    dateParts = dateStr.split('.');
  } else {
    // Fallback
    return Date.now();
  }

  // Determine date format (day/month/year or month/day/year)
  let day: number, month: number, year: number;

  if (dateParts.length === 3) {
    // Assume DD/MM/YYYY or MM/DD/YYYY
    const first = parseInt(dateParts[0]);
    const second = parseInt(dateParts[1]);
    const third = parseInt(dateParts[2]);

    // If first > 12, it must be day (DD/MM/YYYY)
    if (first > 12) {
      day = first;
      month = second;
      year = third;
    }
    // If second > 12, it must be day (MM/DD/YYYY)
    else if (second > 12) {
      month = first;
      day = second;
      year = third;
    }
    // Ambiguous - assume DD/MM/YYYY (European format most common)
    else {
      day = first;
      month = second;
      year = third;
    }

    // Handle 2-digit year
    if (year < 100) {
      year += year < 50 ? 2000 : 1900;
    }
  } else {
    // Fallback
    return Date.now();
  }

  // Parse time
  let hours = 0, minutes = 0, seconds = 0;
  const isPM = /PM/i.test(timeStr);
  const isAM = /AM/i.test(timeStr);

  // Remove AM/PM
  const cleanTime = timeStr.replace(/\s*(AM|PM)/i, '');
  const timeParts = cleanTime.split(':');

  if (timeParts.length >= 2) {
    hours = parseInt(timeParts[0]);
    minutes = parseInt(timeParts[1]);

    if (timeParts.length === 3) {
      seconds = parseInt(timeParts[2]);
    }

    // Convert 12-hour to 24-hour
    if (isPM && hours < 12) {
      hours += 12;
    } else if (isAM && hours === 12) {
      hours = 0;
    }
  }

  // Create date object
  try {
    const date = new Date(year, month - 1, day, hours, minutes, seconds);
    return date.getTime();
  } catch (error) {
    console.error('Failed to parse date:', dateStr, timeStr, error);
    return Date.now();
  }
}
