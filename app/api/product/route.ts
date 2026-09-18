
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


export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const site = searchParams.get("site");
  const ref = searchParams.get("ref");
  const name = searchParams.get("name");
  const model = searchParams.get("model");
  
  if (!site || !ref) return NextResponse.json({ error: "site와 ref 파라미터가 필요합니다." }, { status: 400 });
  const scraper = SCRAPERS[site];
  if (!scraper) return NextResponse.json({ error: "알 수 없는 사이트입니다." }, { status: 400 });

  try {
    const result = await scraper.getByRef(ref, name);
    if (!result) return NextResponse.json({ error: "상품을 찾을 수 없습니다." }, { status: 404 });
    result.reviewImages = (result.reviewImages || []).slice(0, MAX_REVIEW_IMAGES);
    result.productImages = (result.productImages || []).slice(0, MAX_PRODUCT_IMAGES);
    if (!result.model) result.model = model || name || ref;
    if (!result.productName) result.productName = name || result.model;
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: `상품 정보를 가져오는 중 오류가 발생했습니다: ${e.message}` }, { status: 500 });
  }
}

