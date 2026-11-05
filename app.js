
const express = require("express");
const { MongoClient } = require("mongodb");
const crypto = require("crypto");
const path = require("path");
require("dotenv").config({
    path: path.join(__dirname, ".env")
});

const app = express();
const PORT = 5000;

app.use(express.urlencoded({ extended: true }));

const client = new MongoClient(process.env.MONGODB_URI);

let collection;

// Escape submitted text before displaying it in HTML
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// Home page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "home.html"));
});

// Handle registration form
app.post("/server", async (req, res) => {

    try {
        const {
            name,
            password,
            age,
            mobile,
            email,
            gender,
            state
        } = req.body;

        let skills = req.body.skills;

        if (!Array.isArray(skills)) {
            skills = skills ? [skills] : [];
        }

        // Server-side validation
        if (
            !name || !password || !age ||
            !mobile || !email || !gender ||
            !state || skills.length === 0
        ) {
            return res.status(400).send("All fields are mandatory!");
        }

        if (!/^[A-Za-z ]{3,40}$/.test(name)) {
            return res.status(400).send("Invalid name!");
        }

        if (password.length < 6) {
            return res.status(400).send("Password must contain at least 6 characters!");
        }

        if (!/^\d{10}$/.test(mobile)) {
            return res.status(400).send("Enter a valid 10-digit mobile number!");
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).send("Invalid email address!");
        }

        if (!Number.isInteger(Number(age)) ||
            Number(age) < 1 || Number(age) > 120) {
            return res.status(400).send("Invalid age!");
        }

        if (!["Male", "Female"].includes(gender)) {
            return res.status(400).send("Invalid gender!");
        }

        const allowedSkills = [
            "JavaScript", "Python", "C++", "Java"
        ];

        if (
            skills.some(skill => !allowedSkills.includes(skill))
        ) {
            return res.status(400).send("Invalid skill selected!");
        }

        // Hash password before saving
        const salt = crypto.randomBytes(16).toString("hex");

        const hashedPassword = crypto.scryptSync(
            password,
            salt,
            64
        ).toString("hex");

        // Create registration document
        const user = {
            name,
            password: hashedPassword,
            salt,
            age: Number(age),
            mobile,
            email,
            gender,
            state,
            skills,
            registeredAt: new Date()
        };

        // Insert into MongoDB
        await collection.insertOne(user);

        // Display submitted details
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Registration Successful</title>
                <style>
                    body {
                        font-family: Arial;
                        background: #f2f2f2;
                        text-align: center;
                        padding: 30px;
                    }

                    .container {
                        background: white;
                        width: 400px;
                        margin: auto;
                        padding: 25px;
                        border-radius: 10px;
                        box-shadow: 0 0 10px #ccc;
                    }

                    h2 {
                        color: green;
                    }

                    p {
                        text-align: left;
                        padding: 5px;
                    }
                </style>
            </head>

            <body>
                <div class="container">
                    <h2>Registration Successful!</h2>

                    <p><b>Name:</b> ${escapeHTML(name)}</p>
                    <p><b>Password:</b> ********</p>
                    <p><b>Age:</b> ${escapeHTML(age)}</p>
                    <p><b>Mobile:</b> ${escapeHTML(mobile)}</p>
                    <p><b>Email:</b> ${escapeHTML(email)}</p>
                    <p><b>Gender:</b> ${escapeHTML(gender)}</p>
                    <p><b>State:</b> ${escapeHTML(state)}</p>
                    <p><b>Skills:</b> ${skills.map(escapeHTML).join(", ")}</p>

                    <h3>Thank You for Registering!</h3>

                    <a href="/">Back to Registration</a>
                </div>
            </body>
            </html>
        `);

    } catch (error) {
        console.error("Registration Error:", error);

        res.status(500).send(
            "Registration failed. Please try again."
        );
    }
});

// Connect MongoDB and start server
async function startServer() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is missing in .env file");
        }

        await client.connect();

        const db = client.db("StudentRegistrationDB");

        collection = db.collection("users");

        console.log("MongoDB connected successfully!");

        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error("MongoDB connection failed:", error);
    }
}

startServer();
