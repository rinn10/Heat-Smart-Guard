// heat-risk: unified submit handler (city_name OR lat/lon)
document.getElementById("heat-risk-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(event.target);
  const data = Object.fromEntries(formData.entries());

  // 共通項目
  const age = data.age?.trim();
  const condition = data.condition?.trim();

  // 都市名フロー用
  const city_name = data.city_name?.trim();

  // 位置情報フロー用（hiddenで埋めた想定）
  const latRaw = data.lat;
  const lonRaw = data.lon;
  const lat = latRaw !== undefined && latRaw !== "" ? Number(latRaw) : null;
  const lon = lonRaw !== undefined && lonRaw !== "" ? Number(lonRaw) : null;

  // 入力バリデーション：
  // 年齢・場所は必須 + （都市名 もしくは (lat & lon) のいずれかが必須）
  if (!age || !condition) {
    alert("年齢と場所を選択してください。");
    return;
  }
  const hasCity = !!city_name;
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lon);

  if (!hasCity && !hasCoords) {
    alert("都市名を入力するか、位置情報の取得を許可してください。");
    return;
  }

  // 送信データを組み立て（都市名優先。なければ座標）
  const requestData = {
    age: parseInt(age, 10),
    condition: condition
  };
  if (hasCity) {
    requestData.city_name = city_name;
  } else {
    requestData.lat = lat;
    requestData.lon = lon;
  }

  const API_URL = "https://fumist.pythonanywhere.com/calculate_risk";

  // 連打防止（任意）
  const submitBtn = event.target.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "計算中…";
  }

  try {
    console.log("Sending data:", requestData);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s タイムアウト

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(requestData),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    console.log("Response status:", response.status);
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("Response error body:", errorText);
      throw new Error(`APIリクエストエラー: ${response.status}`);
    }

    const result = await response.json();
    console.log("Response data:", result);
    console.log("Keys in response:", Object.keys(result));
    // タイポ修正: lisk_level → risk_level（ログのみ）
    if ("lisk_level" in result) {
      console.warn("Server returned 'lisk_level' (typo?) value:", result.lisk_level);
    }

    // 受け取りキーはバックエンドに合わせて調整
    const storageData = {
      city_name: hasCity ? city_name : null,
      lat: hasCoords ? lat : null,
      lon: hasCoords ? lon : null,
      age: age,
      condition: condition,
      heatIndex: result.heat_index ?? null,
      wbgt: result.wbgt ?? null,
      riskLevel: result.final_risk ?? null,
      riskBucket: result.risk_bucket ?? null,   // 例: "low" | "mid" | "high" | "veryhigh"
      riskLabel: result.risk_label ?? null      // 例: "低" | "中" | "高" | "非常に高い"
    };
    console.log("Data being stored:", storageData);

    localStorage.setItem("heatRiskResult", JSON.stringify(storageData));

    // 結果ページへ
    window.location.href = "result.html";
  } catch (error) {
    console.error("エラー:", error);
    if (error.name === "AbortError") {
      alert("サーバーの応答がタイムアウトしました。通信環境をご確認の上、再試行してください。");
    } else {
      alert("エラーが発生しました。時間をおいて再試行してください。");
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "結果を見る";
    }
  }
});
