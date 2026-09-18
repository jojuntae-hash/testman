
import { NextResponse } from "next/server";
import { client } from "@/lib/scrapers/http";
import cuckoo from "@/lib/scrapers/cuckoo";
import coway from "@/lib/scrapers/coway";
import skmagic from "@/lib/scrapers/skmagic";
import JSZip from "jszip";

const SCRAPERS = { cuckoo, coway, skmagic };
const REFERERS = {
  cuckoo: "https://www.cuckoo.co.kr/",
  coway: "https://www.coway.com/",
  skmagic: "https://www.skmagic.com/",
};

const MAX_REVIEW_IMAGES = 20;
const MAX_PRODUCT_IMAGES = 20;

function safeName(name) {
  return (name || "product").replace(/[\\/:*?"<>|]/g, "_").trim() || "product";
}


export async function POST(req) {
  try {
    const body = await req.json();
    const { site, model, productImages, reviewImages } = body;
    if (!site || !model) return NextResponse.json({ error: "site와 model이 필요합니다." }, { status: 400 });

    const referer = REFERERS[site];
    const zip = new JSZip();
    let savedCount = 0;
    let failedCount = 0;

    async function addToZip(url, filename) {
      try {
        const response = await client.get(url, {
          responseType: "arraybuffer",
          headers: referer ? { Referer: referer } : {},
        });
        const ext = (url.split("?")[0].match(/\.(jpg|jpeg|png|webp|gif)$/i) || [, "jpg"])[1].toLowerCase();
        zip.file(`${filename}.${ext}`, response.data);
        savedCount++;
      } catch (e) {
        failedCount++;
      }
    }

    const products = (productImages || []).slice(0, MAX_PRODUCT_IMAGES);
    for (let i = 0; i < products.length; i++) {
      const filename = products.length > 1 ? `product_${String(i + 1).padStart(2, "0")}` : "product";
      await addToZip(products[i], filename);
    }

    const reviews = (reviewImages || []).slice(0, MAX_REVIEW_IMAGES);
    for (let i = 0; i < reviews.length; i++) {
      await addToZip(reviews[i], `review_${String(i + 1).padStart(2, "0")}`);
    }

    if (savedCount === 0) {
      return NextResponse.json({ error: "사진을 하나도 받아오지 못했습니다." }, { status: 502 });
    }

    const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    const zipName = `${safeName(site)}_${safeName(model)}.zip`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipName}"`,
        "X-Saved-Count": String(savedCount),
        "X-Failed-Count": String(failedCount),
        "Access-Control-Expose-Headers": "X-Saved-Count, X-Failed-Count",
      },
    });
  } catch(e) {
    return NextResponse.json({ error: "서버 오류: " + e.message }, { status: 500 });
  }
}

