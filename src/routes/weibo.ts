import type { RouterData } from "../types.js";
import type { RouterType } from "../router.types.js";
import { get } from "../utils/getData.js";
import { getTime } from "../utils/getTime.js";
import { config } from "../config";

export const handleRoute = async (_: undefined, noCache: boolean) => {
  const listData = await getList(noCache);
  const routeData: RouterData = {
    name: "weibo",
    title: "微博",
    type: "热搜榜",
    description: "实时热点，每分钟更新一次",
    link: "https://s.weibo.com/top/summary/",
    total: listData.data?.length || 0,
    ...listData,
  };
  return routeData;
};

const getList = async (noCache: boolean) => {
  // 使用新的 API 接口 - 这个接口无需登录
  const url = "https://weibo.com/ajax/side/hotSearch";

  const result = await get({
    url,
    noCache,
    ttl: 60,
    headers: {
      Referer: "https://weibo.com",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    },
  });

  // 添加数据验证和错误处理
  if (!result?.data?.data?.realtime) {
    console.error("Weibo API response structure error:", JSON.stringify(result, null, 2));
    return {
      ...result,
      data: [],
    };
  }

  const list = result.data.data.realtime;
  
  return {
    ...result,
    data: list
      .filter((v: any) => v && v.word)
      .map((v: any, index: number) => {
        const key = v.word_scheme ?? `#${v.word}`;
        return {
          id: v.mid || `${index}`,
          title: v.word,
          desc: key,
          timestamp: null, // 新接口不提供时间戳
          hot: v.num || v.raw_hot,
          url: `https://s.weibo.com/weibo?q=${encodeURIComponent(key)}&t=31&band_rank=1&Refer=top`,
          mobileUrl: `https://m.weibo.cn/search?containerid=100103type=1&q=${encodeURIComponent(key)}`,
        };
      }),
  };
};
