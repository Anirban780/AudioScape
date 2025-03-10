require("dotenv").config();
const express = require("express");
const cors = require("cors");
const spotifyRoutes = require("./routes/spotifyRoutes");

const app = express();
app.use(cors());
app.use(express.json());

//use spotify's routes
app.use("/spotify", spotifyRoutes);

const PORT= 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

