const cheerio = require('cheerio');
const { createSessionClient } = require('./http');

const BASE = 'https://www.coway.com';

function flattenOptions(product) {
  const flat = [];
  const catMap = product.prdOptList || {};
  Object.values(catMap).forEach((subMap) => {
    Object.values(subMap).forEach((opt) => flat.push(opt));
  });
  return flat;
}

async function rawSearch(client, query) {
  let synonym = null;
  try {
    const synRes = await client.get(`${BASE}/core/fcommunity/synonymtext/search`, {
      params: { schtxt: query },
    });
    synonym = synRes.data && synRes.data.obj ? synRes.data.obj : null;
  } catch (e) {
    // synonym lookup is best-effort; ignore failures
  }

  const params = new URLSearchParams();
  params.append('schctgno', '');
  params.append('pageSize', '20');
  params.append('pageNumber', '1');
  params.append('sortkey', 'SALES');
  params.append('filterFl', 'N');
  params.append('schtxt', query);
  if (synonym && synonym !== query) params.append('schtxt', synonym);
  params.append('renewlp', 'Y');
  params.append('renewProductListTarget', 'search');
  params.append('reRentalFlag', 'N');

  const res = await client.get(`${BASE}/core/fproduct/list?${params.toString()}`);
  return (res.data && res.data.obj ? res.data.obj.content : []) || [];
}

// Returns a list of candidate products (one entry per product, using its first color option)
async function searchList(query) {
  const { instance: client } = createSessionClient();
  const content = await rawSearch(client, query);

  return content
    .map((product) => {
      const opt = flattenOptions(product)[0];
      if (!opt) return null;
      let thumbnail = opt.saveimgloc || null;
      if (thumbnail && thumbnail.startsWith('//')) thumbnail = 'https:' + thumbnail;
      return {
        ref: `${opt.prdno}:${opt.optno}`,
        name: opt.prdnm,
        model: opt.modelno,
        thumbnail,
      };
    })
    .filter(Boolean);
}

async function getByRef(ref) {
  const [prdnoStr, optnoStr] = ref.split(':');
  const prdno = Number(prdnoStr);
  const optno = Number(optnoStr);

  const { instance: client, jar } = createSessionClient();
  const res = await client.get(`${BASE}/product/detail`, { params: { prdno, optno } });
  const $ = cheerio.load(res.data);

  const productName = $('meta[property="og:title"]').attr('content') || $('title').text().trim();

  // The full product photo gallery isn't in the page's initial HTML (it's
  // swiper-rendered client-side) — pull it from the same option-detail API
  // the page itself calls.
  let productImages = [];
  try {
    const detailRes = await client.get(`${BASE}/core/fproduct/package/detail/${prdno}`, {
      params: { reRentalFlag: 'N' },
    });
    const compList = (detailRes.data && detailRes.data.obj && detailRes.data.obj.compProductList) || [];
    const lpList = compList.length ? compList[0].lpList || [] : [];
    const option = lpList.find((o) => o.optno === optno) || lpList[0];
    if (option) {
      const seen = new Set();
      (option.imgList || []).forEach((img) => {
        let src = img.saveimgloc;
        if (!src) return;
        if (src.startsWith('//')) src = 'https:' + src;
        if (!seen.has(src)) {
          seen.add(src);
          productImages.push(src);
        }
      });
      if (productImages.length === 0 && option.saveimgloc) productImages.push(option.saveimgloc);
    }
  } catch (e) {
    console.error('coway product image fetch failed:', e.message);
  }
  if (productImages.length === 0) {
    const ogImg = $('meta[property="og:image"]').attr('content');
    if (ogImg) productImages.push(ogImg);
  }

  // Review photos: the product page calls /core/fcommunity/review (NOT
  // /review/photo — that one is a site-wide "best reviews" feed that ignores
  // prdno entirely and was returning the same handful of images for every
  // product). This endpoint also only filters correctly when the body is
  // sent as application/x-www-form-urlencoded — a JSON body silently falls
  // back to the same unfiltered site-wide feed.
  const reviewImages = [];
  try {
    const cookies = await jar.getCookies(BASE);
    const xsrf = cookies.find((c) => c.key === 'XSRF-TOKEN');
    const body = new URLSearchParams({
      pageSize: '20',
      pageNumber: '1',
      sortkey: 'BEST',
      orderbestfl: 'Y',
      prdno: String(prdno),
    }).toString();
    const reviewRes = await client.post(`${BASE}/core/fcommunity/review`, body, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(xsrf ? { 'X-XSRF-TOKEN': xsrf.value } : {}),
      },
    });
    const content = reviewRes.data && reviewRes.data.obj ? reviewRes.data.obj.content : [];
    const seen = new Set();
    content.forEach((review) => {
      (review.reviewImg || []).forEach((img) => {
        let src = img.attchloc;
        if (!src) return;
        if (src.startsWith('//')) src = 'https:' + src;
        if (!seen.has(src)) {
          seen.add(src);
          reviewImages.push(src);
        }
      });
    });
  } catch (e) {
    console.error('coway review fetch failed:', e.message);
  }

  return {
    site: 'coway',
    siteName: '코웨이',
    model: null, // filled by caller from the candidate list when available
    productName,
    productUrl: `${BASE}/product/detail?prdno=${prdno}&optno=${optno}`,
    productImages,
    reviewImages,
  };
}

module.exports = { searchList, getByRef };
