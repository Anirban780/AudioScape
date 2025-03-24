require("dotenv").config();
const express = require("express");
const cors = require("cors");
const trackRoutes = require("./routes/trackRoutes")
const firestoreRoutes = require("./routes/firestoreRoutes")

const app = express();

const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.PROD_FRONTEND_URL
];

// Configure CORS
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true
}));


app.use(express.json());

app.use("/youtube", trackRoutes);
app.use('/api/songs', firestoreRoutes);

app.get("/", (req, res) => {
    res.send("Audioscape Server is running successfully!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})
