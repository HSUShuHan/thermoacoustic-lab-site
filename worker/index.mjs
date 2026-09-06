// Worker 入口：靜態資產照舊由 ASSETS 服務，另提供 /api/beacon 匿名訪客回報。
// Cloudflare 對每個請求附帶城市級地理資訊（request.cf），寫入 Analytics Engine：
//   blobs = [國家 A2, 省州, 城市, 緯度(0.1°), 經度(0.1°)]，double1 = 1 次造訪。
// 不記 IP、不寫 cookie；經緯度取整到 0.1°（約 10 km）僅供地圖聚合。
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/beacon" && request.method === "POST") {
      const cf = request.cf ?? {};
      const round1 = (v) => {
        const f = parseFloat(v);
        return Number.isFinite(f) ? String(Math.round(f * 10) / 10) : "";
      };
      try {
        env.VISITS?.writeDataPoint({
          blobs: [
            cf.country ?? "XX",
            cf.region ?? "",
            cf.city ?? "",
            round1(cf.latitude),
            round1(cf.longitude),
          ],
          doubles: [1],
          indexes: [cf.country ?? "XX"],
        });
      } catch {}
      return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
    }
    return env.ASSETS.fetch(request);
  },
};
