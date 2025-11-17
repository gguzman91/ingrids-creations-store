const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public"));


// --- Load Data Files ---
const PRODUCTS = JSON.parse(fs.readFileSync("./data/products.json"));
let DISCOUNTS = JSON.parse(fs.readFileSync("./data/discounts.json"));
let INVENTORY = JSON.parse(fs.readFileSync("./data/inventory.json"));


// --- PayPal Route (client-side handles checkout) ---
app.get("/products", (req, res) => {
    res.json(PRODUCTS);
});


// --- Validate Discount Code ---
app.post("/apply-discount", (req, res) => {
    const { code } = req.body;

    if (!DISCOUNTS[code]) {
        return res.json({ valid: false });
    }

    res.json({
        valid: true,
        discountPercent: DISCOUNTS[code]
    });
});


// --- Inventory Check + Email ---
app.post("/complete-order", async (req, res) => {
    const { items, email, total } = req.body;

    // Verify Inventory
    for (let item of items) {
        if (!INVENTORY[item.id] || INVENTORY[item.id] < item.quantity) {
            return res.json({ success: false, message: "Item out of stock." });
        }
    }

    // Deduct inventory
    for (let item of items) {
        INVENTORY[item.id] -= item.quantity;
    }

    fs.writeFileSync("./data/inventory.json", JSON.stringify(INVENTORY, null, 2));


    // --- Send Order Email ---
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.STORE_EMAIL,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    const orderText = `
Thank you for your order from Ingrid's Creations!

Order Details:
${items.map(i => `${i.name} - ${i.color} x${i.quantity}`).join("\n")}

Total Paid: $${total}

We appreciate your business!
    `;

    await transporter.sendMail({
        from: process.env.STORE_EMAIL,
        to: email,
        subject: "Your Order Confirmation - Ingrid's Creations",
        text: orderText
    });

    res.json({ success: true });
});


// --- Start Server ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
