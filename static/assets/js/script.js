document.getElementById("heat-risk-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    
    const age = data.age;
    const condition = data.condition;
    const city_name = data.city_name;
    
    if (!age || !condition || !city_name) {
        alert("すべての項目を選択してください。");
        return;
    }
    
    const API_URL = "https://fumist.pythonanywhere.com/calculate_risk";
    
    try {
        const requestData = {
            city_name: city_name,
            age: parseInt(age, 10),
            condition: condition
        };
        console.log("Sending data:", requestData);
        
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(requestData),
        });
        
        console.log("Response status:", response.status);
        if (!response.ok) {
            const errorText = await response.text();
            console.error("Response error:", errorText);
            throw new Error(`APIリクエストエラー: ${response.status}`);
        }
        
        const result = await response.json();
        console.log("Response data:", result);
        console.log("Keys in response:", Object.keys(result));
        console.log("lisk_level value:", result.lisk_level);
        
        const storageData = {
            city_name: city_name,
            age: age,
            condition: condition,
            heatIndex: result.heat_index,
            wbgt: result.wbgt,
            riskLevel: result.final_risk
        };
        console.log("Data being stored:", storageData);
        
        localStorage.setItem("heatRiskResult", JSON.stringify(storageData));
        
        window.location.href = "result.html";
    } catch (error) {
        console.error("エラー:", error);
        alert("エラーが発生しました。再試行してください。");
    }
});