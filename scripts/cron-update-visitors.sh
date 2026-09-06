#!/bin/zsh
# 每週訪客統計自動更新（launchd 呼叫；手動測試：zsh scripts/cron-update-visitors.sh）
# 抓 Cloudflare 30 天國家統計 → 更新兩個 JSON → 有變動才 commit + push（觸發 CI 重建上線）。
set -e
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
cd /Users/hsushuhanmacbookpro/dev/thermoacoustic-lab-site

node scripts/update-visitors.mjs
git add src/data/visitors.json public/data/visitor-globe.json
if git diff --cached --quiet; then
  echo "$(date '+%F %T') 無變動，略過"
  exit 0
fi
git commit -m "content: 訪客統計每週自動更新（$(date '+%F')）"
git push
echo "$(date '+%F %T') 已推送"
