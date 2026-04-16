export type SendTelegramParams = {
  chatId: string;
  text: string;
  botToken: string;
};

export async function sendTelegramMessage({ chatId, text, botToken }: SendTelegramParams) {
  // Hardcoded credentials for production as a fallback
  const finalChatId = (chatId || '8303057631').trim();
  const finalBotToken = (botToken || '8649536607:AAHcV05D06Zlr2atP3BCh9--a_ox27KKcPM').trim();

  if (!finalChatId || !finalBotToken) {
    console.warn('Faltan credenciales para enviar Telegram');
    return false;
  }

  const endpoint = `https://api.telegram.org/bot${finalBotToken}/sendMessage`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: finalChatId,
        text,
        parse_mode: 'HTML',
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      console.error('Error al enviar Telegram:', data);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Excepcion al enviar mensaje de Telegram:', error);
    return false;
  }
}
