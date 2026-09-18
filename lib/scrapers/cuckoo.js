const cheerio = require('cheerio');
const { client } = require('./http');

const BASE = 'https://www.cuckoo.co.kr';

function parseList($, ulSelector, type) {
  const items = [];
  $(`${ulSelector} > li`).each((_, el) => {
    const li = $(el);
    let id = null;
    if (type === 'mall') {
      id = li.attr('data-product-no') || null;
    } else {
      const href = li.find('a').first().attr('href') || '';
      const m = href.match(/productView\?idx=(\d+)/);
      id = m ? m[1] : null;
    }
    if (!id) return;

    let thumbnail = li.find('img').first().attr('src') || null;
    if (thumbnail && thumbnail.startsWith('//')) thumbnail = 'https:' + thumbnail;

    const model = li.find('.category').first().text().trim() || null;
    const name = li.find('.code_no').first().text().trim() || null;

    items.push({ ref: `${type}:${id}`, name, model, thumbnail });
  });
  return items;
}

async function searchList(query) {
  const res = await client.get(`${BASE}/searchWord`, { params: { searchWord: query } });
  const $ = cheerio.load(res.data);

  // Rental listings are preferred: their detail pages render reviews server-side.
  const rental = parseList($, '#searchWordRentalList', 'rental');
  const mall = parseList($, '#searchWordMallList', 'mall');
  return [...rental, ...mall];
}

async function getRentalDetail(idx) {
  const res = await client.get(`${BASE}/rental/productView`, { params: { idx } });
  const $ = cheerio.load(res.data);

  const productImage = $('meta[property="og:image"]').attr('content') || null;
  const productModel = $('meta[property="og:title"]').attr('content') || null;

  const reviewImages = [];
  const seen = new Set();
  $('img.lazy-img[alt="리뷰이미지"]').each((_, el) => {
    let src = $(el).attr('data-src') || $(el).attr('src');
    if (!src) return;
    if (src.startsWith('//')) src = 'https:' + src;
    if (!seen.has(src)) {
      seen.add(src);
      reviewImages.push(src);
    }
  });

  return {
    productImages: productImage ? [productImage] : [],
    productModel,
    reviewImages,
    detailUrl: `${BASE}/rental/productView?idx=${idx}`,
  };
}

async function getMallDetail(productNo) {
  const res = await client.get(`${BASE}/mall/productView`, { params: { productNo } });
  const html = res.data;
  const $ = cheerio.load(html);

  // Cuckoo only ever has one real product photo (just multiple resolutions of
  // it) — prefer the "L" (large) variant embedded in the page's product data,
  // falling back to og:image.
  let productImage = null;
  try {
    const idx = html.indexOf('"productFileList":');
    if (idx >= 0) {
      const endIdx = html.indexOf(']', idx);
      const arr = JSON.parse(html.substring(idx + '"productFileList":'.length, endIdx + 1));
      const large = arr.find((x) => x.imgGb === 'L') || arr[0];
      if (large && large.filePath) productImage = `${BASE}${large.filePath}`;
    }
  } catch (e) {
    // fall through to og:image
  }
  if (!productImage) productImage = $('meta[property="og:image"]').attr('content') || null;

  const productModel = $('meta[property="og:title"]').attr('content') || null;

  const productCdMatch = html.match(/productCd\s*:\s*"([^"]+)"/);
  const productCd = productCdMatch ? productCdMatch[1] : null;

  let reviewImages = [];
  if (productCd) {
    try {
      const reviewRes = await client.post(
        `${BASE}/rest/mall/mallProductReviewSearch`,
        { productCd, reviewSite: 'M', page: 1 },
        { headers: { 'Content-Type': 'application/json' } }
      );
      const list = reviewRes.data && reviewRes.data.reviewList ? reviewRes.data.reviewList : [];
      list.forEach((r) => {
        if (r.filePath && r.fileName) reviewImages.push(`${r.filePath}${r.fileName}`);
      });
    } catch (e) {
      // best effort — some mall listings genuinely have 0 reviews on this channel
    }
  }

  return {
    productImages: productImage ? [productImage] : [],
    productModel,
    reviewImages,
    detailUrl: `${BASE}/mall/productView?productNo=${productNo}`,
  };
}

async function getByRef(ref, fallbackName) {
  const [type, id] = ref.split(':');
  const detail = type === 'rental' ? await getRentalDetail(id) : await getMallDetail(id);

  return {
    site: 'cuckoo',
    siteName: '쿠쿠',
    model: detail.productModel,
    productName: fallbackName || detail.productModel,
    productUrl: detail.detailUrl,
    productImages: detail.productImages,
    reviewImages: detail.reviewImages,
  };
}

module.exports = { searchList, getByRef };
