const cheerio = require('cheerio');
const { client } = require('./http');

const BASE = 'https://www.skmagic.com';

function normalize(value) {
  return String(value || '').replace(/\s+/g, '').toLowerCase();
}

function parseProductLinks($, selector, query = '') {
  const candidatesById = new Map();
  const needle = normalize(query);

  $(selector).each((_, el) => {
    const root = $(el);
    const link = root.is('a[href*="goodsId="]')
      ? root
      : root.find('a[href*="goodsId="]').first();
    const href = link.attr('href') || '';
    const match = href.match(/goodsId=([A-Za-z0-9]+)/);
    if (!match) return;

    const goodsId = match[1];
    const searchableText = [
      root.text(),
      link.attr('data-goodsnm'),
      link.attr('data-prdtcd'),
      root.find('img').first().attr('alt'),
    ].join(' ');
    if (needle && !normalize(searchableText).includes(needle)) return;
    let thumbnail = root.find('img').first().attr('src') || null;
    if (thumbnail && thumbnail.startsWith('//')) thumbnail = 'https:' + thumbnail;

    const name =
      root.find('.item-name02 a, .item-name a, .prod_name, .price_box .name').first().text().trim() ||
      link.attr('data-goodsnm') ||
      root.find('img').first().attr('alt') ||
      null;

    const modelElement = root.find('.item-model02, .item-model').first().clone();
    modelElement.find('.item-grade').remove();
    const model =
      modelElement.text().trim() ||
      root.find('.prod_num').first().text().trim() ||
      link.attr('data-prdtcd') ||
      null;

    const candidate = { ref: goodsId, name, model, thumbnail };
    const previous = candidatesById.get(goodsId);
    if (!previous || (!previous.model && candidate.model)) {
      candidatesById.set(goodsId, candidate);
    }
  });

  return Array.from(candidatesById.values());
}

async function searchList(query) {
  const res = await client.get(`${BASE}/search/searchResult`, {
    params: { searchType: 'recent', srchWord: query },
  });
  const html = res.data;

  const $ = cheerio.load(html);
  const candidates = html.includes('검색어와 일치하는 결과가 없습니다')
    ? []
    : parseProductLinks($, '.product-items');

  // SK매직의 검색 색인은 새 상품 반영이 늦을 때가 있다. 홈페이지에
  // 노출 중인 상품도 상품명/모델명의 부분일치 대상으로 합친다.
  const homeRes = await client.get(`${BASE}/`);
  const homeCandidates = parseProductLinks(
    cheerio.load(homeRes.data),
    'a[href*="indexGoodsDetail?goodsId="]',
    query
  );

  const byId = new Map(candidates.map((candidate) => [candidate.ref, candidate]));
  homeCandidates.forEach((candidate) => byId.set(candidate.ref, candidate));
  return Array.from(byId.values());
}

async function getDetail(goodsId) {
  const res = await client.get(`${BASE}/goods/indexGoodsDetail`, { params: { goodsId } });
  const html = res.data;
  const $ = cheerio.load(html);

  const prdtCdMatch = html.match(/prdtCd\s*:\s*'([^']+)'/);
  const prdtCd = prdtCdMatch ? prdtCdMatch[1] : null;

  const rawTitle = $('meta[property="og:title"]').attr('content') || $('title').text();
  const productName = rawTitle.split('|')[0].trim();

  return { prdtCd, productName };
}

async function getProductImages(goodsId) {
  const params = new URLSearchParams({ goodsId });
  const res = await client.post(`${BASE}/goods/getOptionGoodsImage`, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const $ = cheerio.load(res.data);
  const images = [];
  const seen = new Set();
  $('img').each((_, el) => {
    let src = $(el).attr('src');
    if (!src || !src.includes(`/image/goods/${goodsId}/`)) return;
    if (src.startsWith('//')) src = 'https:' + src;
    // thumbnails are suffixed like _480x480 — strip it to get the original resolution
    const original = src.replace(/_\d+x\d+(?=\.\w+$)/, '');
    if (!seen.has(original)) {
      seen.add(original);
      images.push(original);
    }
  });
  return images;
}

async function getPhotoReviews(goodsId, prdtCd) {
  const maxImages = 20;
  const images = [];
  const seen = new Set();

  for (let page = 1; page <= 10 && images.length < maxImages; page++) {
    const params = new URLSearchParams({
      goodsId,
      prdtCd: prdtCd || '',
      compGbCd: '10',
      type: '',
      curPageNo: String(page),
      imgRegYn: 'Y',
    });
    const res = await client.post(`${BASE}/goods/indexGoodsCommentList`, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const $ = cheerio.load(res.data);
    let pageImageCount = 0;

    $('.thmb img').each((_, el) => {
      if (images.length >= maxImages) return;
      let src = $(el).attr('src');
      if (!src || !src.includes('/image/goods_comment/')) return;
      pageImageCount++;
      if (src.startsWith('//')) src = 'https:' + src;
      // thumbnails are suffixed like _140x96 — strip it to get the original resolution
      const original = src.replace(/_\d+x\d+(?=\.\w+$)/, '');
      if (!seen.has(original)) {
        seen.add(original);
        images.push(original);
      }
    });

    if (pageImageCount === 0) break;
  }

  return images;
}

async function getByRef(goodsId) {
  const detail = await getDetail(goodsId);
  const [reviewImages, productImages] = await Promise.all([
    getPhotoReviews(goodsId, detail.prdtCd),
    getProductImages(goodsId).catch((e) => {
      console.error('skmagic product image fetch failed:', e.message);
      return [];
    }),
  ]);

  return {
    site: 'skmagic',
    siteName: 'SK매직',
    model: detail.prdtCd,
    productName: detail.productName,
    productUrl: `${BASE}/goods/indexGoodsDetail?goodsId=${goodsId}`,
    productImages,
    reviewImages,
  };
}

module.exports = { searchList, getByRef };
