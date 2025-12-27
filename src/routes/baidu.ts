import type { RouterData, ListContext, Options, RouterResType } from "../types.js";
import type { RouterType } from "../router.types.js";
import { get } from "../utils/getData.js";
import * as cheerio from "cheerio";

const typeMap: Record<string, string> = {
  realtime: "热搜",
  novel: "小说",
  movie: "电影",
  teleplay: "电视剧",
  car: "汽车",
  game: "游戏",
};

export const handleRoute = async (c: ListContext, noCache: boolean) => {
  const type = c.req.query("type") || "realtime";
  const listData = await getList({ type }, noCache);
  const routeData: RouterData = {
    name: "baidu",
    title: "百度",
    type: typeMap[type],
    params: {
      type: {
        name: "热搜类别",
        type: typeMap,
      },
    },
    link: "https://top.baidu.com/board",
    total: listData.data?.length || 0,
    ...listData,
  };
  return routeData;
};

const getList = async (options: Options, noCache: boolean): Promise<RouterResType> => {
  const { type } = options;
  const url = `https://top.baidu.com/board?tab=${type}`;
  
  const result = await get({
    url,
    noCache,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    },
  });

  try {
    const $ = cheerio.load(result.data);
    const items: any[] = [];
    
    // 解析每个热搜条目
    $('.category-wrap_iQLoo').each((index, element) => {
      const $item = $(element);
      
      // 提取排名
      const rankText = $item.find('.index_1Ew5p').text().trim();
      const rank = rankText === "" ? 0 : parseInt(rankText) || index + 1;
      
      // 提取标题
      const title = $item.find('.title_dIF3B .c-single-text-ellipsis').text().trim();
      
      // 提取描述
      const desc = $item.find('.hot-desc_1m_jR.large_nSuFU').text().replace(/查看更多>.*/g, '').trim() ||
                   $item.find('.hot-desc_1m_jR.small_Uvkd3').text().replace(/查看更多>.*/g, '').trim();
      
      // 提取封面图
      const cover = $item.find('.img-wrapper_29V76 img').last().attr('src') || '';
      
      // 提取热度
      const hotText = $item.find('.hot-index_1Bl1a').text().trim().replace(/,/g, '');
      const hot = parseInt(hotText) || 0;
      
      // 提取链接
      const url = $item.find('a.title_dIF3B').attr('href') || '';
      const fullUrl = url.startsWith('http') ? url : `https://www.baidu.com${url}`;
      
      // 提取标签（热、新等）
      const tag = $item.find('.hot-tag_1G080').text().trim();
      
      if (title) {
        items.push({
          id: rank,
          title: title,
          desc: desc,
          cover: cover,
          author: tag,
          timestamp: Date.now(),
          hot: hot,
          url: fullUrl,
          mobileUrl: fullUrl,
        });
      }
    });

    if (items.length === 0) {
      console.error("Failed to extract data from page");
      return {
        ...result,
        data: [],
      };
    }

    return {
      ...result,
      data: items,
    };
  } catch (error) {
    console.error("Error parsing Baidu hot list:", error);
    return {
      ...result,
      data: [],
    };
  }
};
