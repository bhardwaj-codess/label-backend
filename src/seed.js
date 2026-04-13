const mongoose = require("mongoose");
const Product = require("./models/Product");

const MONGO_URI = "mongodb+srv://abhibhardwaj:Webblaze%40123@firstdb.brtukqy.mongodb.net/vashishat"; // change if remote

const data = [
  { catalogueNumber: "PH0010A", name: "Meter Scale Wooden" },
  { catalogueNumber: "PH0010B", name: "Half Meter Scale Wooden" },
  { catalogueNumber: "PH0010C", name: "Meter Scale Wooden Metal End" },
  { catalogueNumber: "PH0010D", name: "Half Meter Scale Wooden Metal End" },
  { catalogueNumber: "PH0010E", name: "Meter Scale Wooden Intermediate" },
  { catalogueNumber: "PH0010F", name: "Half Meter Scale Wooden Intermediate" },
  { catalogueNumber: "PH0012A", name: "Meter Scale Wooden Vertical Reading" },
  { catalogueNumber: "PH0012B", name: "Half Meter Scale Wooden Vertical Reading" },
  { catalogueNumber: "PH0012C", name: "Half Meter Scale Acrylic Vertical Reading" },
  { catalogueNumber: "PH0014A", name: "Rule Steel L 15 cm" },
  { catalogueNumber: "PH0014B", name: "Rule Steel L 30 cm" },
  { catalogueNumber: "PH0014C", name: "Rule Steel L 60 cm" }
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // clear old data if you want a fresh start
    await Product.deleteMany({});

    // insert all data
    await Product.insertMany(data);

    console.log("🎉 Data inserted successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding data:", err);
    process.exit(1);
  }
}

seed();
