#!/usr/bin/env zsh

set -euo pipefail

VIX_SYMBOL="%5EVIX"
SSEC_SYMBOL="000001.SS"
YAHOO_API="https://query1.finance.yahoo.com/v8/finance/chart"

UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

get_price() {
  local symbol="$1"

  curl -s \
    -H "User-Agent: $UA" \
    "${YAHOO_API}/${symbol}?interval=1d&range=1d" |
    jq -r '.chart.result[0].meta.regularMarketPrice // empty'
}

VIX_PRICE=$(get_price "$VIX_SYMBOL")
SSEC_PRICE=$(get_price "$SSEC_SYMBOL")

echo "Global Market Indices"
echo

if [[ -n "$VIX_PRICE" ]]; then
  printf "VIX Index: %.2f\n" "$VIX_PRICE"
else
  echo "VIX Index: N/A"
fi

if [[ -n "$SSEC_PRICE" ]]; then
  printf "Shanghai Composite: %.2f\n" "$SSEC_PRICE"
else
  echo "Shanghai Composite: N/A"
fi

echo
echo "Time: $(TZ=Asia/Shanghai date '+%H:%M:%S') (Beijing)"

