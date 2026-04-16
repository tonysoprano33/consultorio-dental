
export type SendTelegramParams = {
  chatId?: string;
  text: string;
  botToken?: string;
};

export async function sendTelegramMessage({ chatId, text, botToken }: SendTelegramParams) {
  // Usa el chatId pasado por parámetro o el de la odontóloga por defecto
  const finalChatId = (chatId || '8303057631').trim();
  const finalBotToken = '8649536607:AAHcV05D06Zlr2atP3BCh9--a_ox27KKcPM';

  const endpoint = `https://api.telegram.org/bot${finalBotToken}/sendMessage`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: finalChatId,
        text,
        parse_mode: 'HTML',
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      console.error('Error Telegram API:', data);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Excepcion Telegram:', error);
    return false;
  }
}
