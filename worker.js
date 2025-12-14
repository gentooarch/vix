/**
 * Cloudflare Worker: VIX + Shanghai Composite Bot (No Icons)
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
          await handleMarketQuery(env, chatId);
        }
      }
    } catch (e) {
      console.error(e);
    }
    return new Response("OK");
  },

  // 2. 处理定时任务 (Cron Triggers)
  async scheduled(event, env, ctx) {
    if (env.TG_CHAT_ID) {
      // 这里的文案也去掉了太阳图标
      await handleMarketQuery(env, env.TG_CHAT_ID, "早安！今日市场指数播报：");
    }
  },
};

/**
 * 通用逻辑：获取多个数据并发送
 */
async function handleMarketQuery(env, chatId, title = null) {
  // 并行获取数据
  const [vixData, ssecData] = await Promise.all([
    getData("%5EVIX"),      // VIX 指数
    getData("000001.SS")    // 上证指数
  ]);

  let replyText = "";

  if (vixData || ssecData) {
    // 默认标题 (移除图标)
    const titleText = title ? title : "<b>全球市场指数</b>";
    
    // 格式化 VIX 显示 (移除国旗图标)
    const vixDisplay = vixData 
      ? `恐慌指数 (VIX): <b>${vixData.price.toFixed(2)}</b>` 
      : `恐慌指数 (VIX): 获取失败`;

    // 格式化 上证 显示 (移除国旗图标)
    const ssecDisplay = ssecData 
      ? `上证指数 (SSEC): <b>${ssecData.price.toFixed(2)}</b>` 
      : `上证指数 (SSEC): 获取失败`;

    // 构建最终消息
    replyText = `${titleText}\n\n` +
                `${vixDisplay}\n` +
                `${ssecDisplay}\n\n` +
                `更新时间: ${new Date().toLocaleTimeString('zh-CN', {timeZone: 'Asia/Shanghai'})} (北京)`;
  } else {
    replyText = "所有数据获取失败，请稍后再试。";
  }

  await sendMessage(env.TG_BOT_TOKEN, chatId, replyText);
}

/**
 * 通用数据获取函数
 */
async function getData(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    
    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      return null;
    }

    const meta = data.chart.result[0].meta;
    
    return {
      price: meta.regularMarketPrice
    };
  } catch (error) {
    console.error(`Yahoo Error for ${symbol}:`, error);
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
