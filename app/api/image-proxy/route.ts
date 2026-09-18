
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
  const url = searchParams.get("url");
  const site = searchParams.get("site");
  
  if (!url) return new NextResponse(null, { status: 400 });
  try {
    const referer = REFERERS[site] || undefined;
    const response = await client.get(url, {
      responseType: "arraybuffer",
      headers: referer ? { Referer: referer } : {},
    });
    
    return new NextResponse(response.data, {
      status: 200,
      headers: {
        "Content-Type": response.headers["content-type"] || "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    return new NextResponse(null, { status: 502 });
  }
}

