/**
 * Cloudflare Worker: VIX Bot + Daily Push (Simplified)
 */

export default {
  // 1. 处理 HTTP 请求 (Telegram Webhook /g 指令)
  async fetch(request, env, ctx) {
    if (request.method !== "POST") return new Response("OK");

    try {
      const payload = await request.json();
      if (payload.message && payload.message.text) {
        const chatId = payload.message.chat.id;
        const text = payload.message.text.trim();

        if (text.startsWith("/g")) {
          await handleVixQuery(env, chatId);
        }
      }
    } catch (e) {
      console.error(e);
    }
    return new Response("OK");
  },

  // 2. 处理定时任务 (Cron Triggers)
  async scheduled(event, env, ctx) {
    // 检查是否配置了目标 Chat ID
    if (env.TG_CHAT_ID) {
      // 发送特定提示语
      await handleVixQuery(env, env.TG_CHAT_ID, "☀️ 早安！今日恐慌指数播报：");
    }
  },
};

/**
 * 通用逻辑：获取数据并发送
 * @param {Object} env 环境变量
 * @param {string} chatId 目标聊天ID
 * @param {string} title 消息标题前缀 (可选)
 */
async function handleVixQuery(env, chatId, title = null) {
  const vixData = await getVixData();
  let replyText = "";

  if (vixData) {
    const price = vixData.price.toFixed(2);
    
    // 设置标题，如果没有传入标题则使用默认的
    const titleText = title ? title : "<b>📊 CBOE VIX Index (恐慌指数)</b>";
    
    // 构建回复内容 (已移除涨跌幅度)
    replyText = `${titleText}\n\n` +
                `当前点数: <b>${price}</b>\n` +
                `更新时间: ${new Date().toLocaleTimeString('zh-CN', {timeZone: 'America/New_York'})} (美东)`;
  } else {
    replyText = "⚠️ 获取 VIX 数据失败，请检查源。";
  }

  await sendMessage(env.TG_BOT_TOKEN, chatId, replyText);
}

/**
 * 从 Yahoo Finance 获取 VIX 数据
 */
async function getVixData() {
  try {
    const symbol = "%5EVIX";
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });
    const data = await response.json();
    const meta = data.chart.result[0].meta;
    
    return {
      price: meta.regularMarketPrice
      // 其他数据不再需要，暂时不返回
    };
  } catch (error) {
    console.error("Yahoo Error:", error);
    return null;
  }
}

/**
 * 发送消息到 Telegram
 */
async function sendMessage(token, chatId, text) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: "HTML"
    }),
  });
}
