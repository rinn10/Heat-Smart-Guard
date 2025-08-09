(async function () {
  const form = document.getElementById("heat-risk-form");
  const status = document.getElementById("status");
  const manualInput = document.getElementById("manual-input");

  // === 1) 位置情報を取得 ===
  function getCurrentPositionWithTimeout(opts = {}) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Geolocation timeout")), opts.timeout || 15000);
      navigator.geolocation.getCurrentPosition(
        (pos) => { clearTimeout(timer); resolve(pos); },
        (err) => { clearTimeout(timer); reject(err); },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  }

  if (!("geolocation" in navigator)) {
    // フォールバック（都市名入力に戻す）
    if (status) status.textContent = "お使いのブラウザは位置情報に対応していません。都市名を入力してください。";
    if (manualInput) manualInput.style.display = "block";
    return;
  }

  let lat = null, lon = null;

  try {
    if (status) status.textContent = "現在地を取得しています…";
    const pos = await getCurrentPositionWithTimeout({ timeout: 15000 });
    lat = pos.coords.latitude;
    lon = pos.coords.longitude;

    if (status) status.textContent = `位置取得成功`;
    // （緯度 ${lat.toFixed(4)}, 経度 ${lon.toFixed(4)}）
    // 都市名入力は不要に
    if (manualInput) manualInput.style.display = "none";
  } catch (e) {
    // 取得失敗 → 既存フロー（都市名）に任せる
    console.warn("Geolocation failed:", e);
    if (status) status.textContent = "位置情報が使用できません。都市名を入力してください。";
    if (manualInput) manualInput.style.display = "block";
    return; // ここで終了：以降は既存の script.js がハンドリング
  }

  // === 2) 送信処理（lat/lon を使う） ===
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    const age = data.age?.trim();
    const condition = data.condition?.trim();

    if (!age || !condition) {
      alert("年齢と場所を選択してください。");
      return;
    }

    // 既存の API と合わせる:
    // A) バックエンドが lat/lon も同じ /calculate_risk で受け取れるなら、このまま OK
    // B) 都市名しか受けないなら、バックエンドに /calculate_risk_by_coords を用意して URL を差し替え
    const API_URL = "https://fumist.pythonanywhere.com/calculate_risk";

    const requestData = {
      // 都市名は送らない。代わりに座標を送る
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      age: parseInt(age, 10),
      condition: condition
    };

    try {
      if (status) status.textContent = "リスク計算中…";

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("Response error:", t);
        throw new Error(`API リクエスト失敗: ${response.status}`);
      }

      const result = await response.json();
      // 返却キーはバックエンドの仕様に合わせてね（下は例）
      const storageData = {
        city_name: null, // 位置情報利用なので null
        age: age,
        condition: condition,
        heatIndex: result.heat_index,
        wbgt: result.wbgt,
        riskLevel: result.final_risk
      };

      localStorage.setItem("heatRiskResult", JSON.stringify(storageData));
      window.location.href = "result.html";
    } catch (err) {
      console.error(err);
      alert("リスク計算に失敗しました。時間をおいて再試行してください。");
      if (status) status.textContent = "";
    }
  });
})();
