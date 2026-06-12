import { gmail_v1 } from 'googleapis';
import { Email, EmailAttachment } from 'src/email/schemas/email.schema';

function decodeBase64(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf8');
}

function getHeaderValue(
  headers: gmail_v1.Schema$MessagePartHeader[],
  name: string,
): string {
  return (
    headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ??
    ''
  );
}

function parseInternalDate(internalDate?: string | null): Date | undefined {
  if (internalDate) {
    return new Date(+internalDate);
  }
  return;
}

export function parseGmailEmail(
  email: gmail_v1.Schema$Message,
  userId: string,
): Partial<Email> {
  const headers = email.payload?.headers || [];

  const from = getHeaderValue(headers, 'From');
  const to = getHeaderValue(headers, 'To');
  const subject = getHeaderValue(headers, 'Subject');

  let textBody = '';
  const attachments: EmailAttachment[] = [];

  function parseParts(parts: gmail_v1.Schema$MessagePart[] = []) {
    for (const part of parts) {
      const { mimeType, body, filename, parts } = part;

      if (mimeType === 'text/plain' && body?.data) {
        textBody += decodeBase64(body.data);
      }

      if (filename && mimeType && body?.attachmentId && body?.size) {
        attachments.push({
          filename,
          mimeType,
          attachmentId: body?.attachmentId,
          size: body?.size,
        });
      }

      if (parts && parts.length > 0) {
        parseParts(part.parts);
      }
    }
  }

  parseParts(email.payload?.parts || []);

  if (!email.id || !email.threadId || !email.labelIds) {
    throw new Error('Invalid email');
  }

  return {
    userId,
    from,
    to: to.split(',').map((t) => t.trim()),
    subject,
    body: textBody,
    historyId: email.historyId ?? undefined,
    emailId: email.id,
    labelIds: email.labelIds,
    threadId: email.threadId,
    emailSentAt: parseInternalDate(email.internalDate),
    attachments,
  };
}
