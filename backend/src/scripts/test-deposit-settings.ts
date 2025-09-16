import axios from "axios";

async function testDepositSettings() {
  console.log("=== Testing Deposit Settings Endpoint ===");

  // Get trader token
  const loginResponse = await axios.post("http://localhost:3000/api/user/login", {
    email: "trader@test.com",
    password: "password123"
  });

  const token = loginResponse.data.token;
  console.log("Got trader token:", token);

  try {
    const response = await axios.get("http://localhost:3000/api/trader/deposits/settings", {
      headers: {
        "x-trader-token": token
      }
    });

    console.log("\nSuccess! Response:");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error("\nError:", error.response?.status, error.response?.data || error.message);
    if (error.response?.data) {
      console.error("Error details:", error.response.data);
    }
  }
}

testDepositSettings()
  .catch((error) => {
    console.error("Script error:", error);
    process.exit(1);
  });