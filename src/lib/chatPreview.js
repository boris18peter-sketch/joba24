/**
 * chatMessagePreview — friendly one-line preview for a chat message.
 *
 * Media messages are stored as "[img]<url>" / "[audio]<url>". In notification
 * popups and the chat inbox list we show a localized label instead of the
 * raw URL.
 *
 * @param {string} content  raw message content
 * @param {(k:string)=>string} t  i18n translate function (optional)
 */
export function chatMessagePreview(content, t) {
  if (!content) return '';
  if (content.startsWith('[img]')) {
    return t ? t('chat_sent_image') : '📷 נשלחה תמונה';
  }
  if (content.startsWith('[audio]')) {
    return t ? t('chat_sent_voice') : '🎤 נשלחה הודעה קולית';
  }
  return content;
}