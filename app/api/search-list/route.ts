
import { NextResponse } from "next/server";
import { client } from "@/lib/scrapers/http";
import cuckoo from "@/lib/scrapers/cuckoo";
import coway from "@/lib/scrapers/coway";
import skmagic from "@/lib/scrapers/skmagic";
import JSZip from "jszip";

const SCRAPERS: Record<string, any> = { cuckoo, coway, skmagic };
const REFERERS: Record<string, string> = {
  cuckoo: "https://www.cuckoo.co.kr/",
  coway: "https://www.coway.com/",
  skmagic: "https://www.skmagic.com/",
};

const MAX_REVIEW_IMAGES = 20;
const MAX_PRODUCT_IMAGES = 20;

function safeName(name: string) {
  return (name || "product").replace(/[\\/:*?"<>|]/g, "_").trim() || "product";
}


export async function GET(req: any) {
  const { searchParams } = new URL(req.url);
  const site = searchParams.get("site");
  const query = searchParams.get("query");
  
  if (!site || !query) return NextResponse.json({ error: "site와 query 파라미터가 필요합니다." }, { status: 400 });
  const scraper = SCRAPERS[site || ""];
  if (!scraper) return NextResponse.json({ error: "알 수 없는 사이트입니다." }, { status: 400 });

  try {
    const candidates = await scraper.searchList(query.trim());
    return NextResponse.json({ candidates: candidates.slice(0, 30) });
  } catch (e: any) {
    return NextResponse.json({ error: `검색 중 오류가 발생했습니다: ${e.message}` }, { status: 500 });
  }
}

